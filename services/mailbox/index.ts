/**
 * VMailx — MailboxService
 *
 * Ownership chain: User → Workspace → Domain (VERIFIED) → Mailbox → Stalwart
 *
 * Every Stalwart provisioning call is preceded by workspace ownership verification.
 * Mailbox passwords are never stored in PostgreSQL — only the Stalwart principal ID.
 */

import type { PrismaClient, Mailbox, MailboxAlias } from "@prisma/client";
import { type Logger, type RequestContext } from "@/lib/logger";
import { type MailProvider } from "@/lib/providers/mail";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/lib/errors";
import { buildEmailAddress } from "@/lib/utils";
import { WorkspaceService } from "@/services/workspace";

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateMailboxInput {
  domainId: string;
  localPart: string;
  displayName: string;
  password: string;
  storageQuotaMb?: number;
}

export interface UpdateMailboxInput {
  displayName?: string;
  isActive?: boolean;
  storageQuotaMb?: number;
}

export interface MailboxWithDomain extends Mailbox {
  domain: { domain: string };
  aliases: MailboxAlias[];
}

// ─── MailboxService ───────────────────────────────────────────────────────────

export class MailboxService {
  constructor(
    private readonly db: PrismaClient,
    private readonly mailProvider: MailProvider,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: Logger
  ) {}

  // ─── Create Mailbox ───────────────────────────────────────────────────────

  async createMailbox(
    ctx: RequestContext,
    input: CreateMailboxInput
  ): Promise<MailboxWithDomain> {
    await this.workspaceService.assertPermission(ctx, "mailbox:create");

    // Verify domain belongs to workspace AND is verified
    const domain = await this.db.domain.findFirst({
      where: { id: input.domainId, workspaceId: ctx.workspaceId },
    });
    if (!domain) throw new NotFoundError("Domain not found");
    if (domain.status !== "VERIFIED") {
      throw new UnprocessableError(
        `Domain "${domain.domain}" is not verified. Verify DNS records first.`
      );
    }

    const localPart = input.localPart.toLowerCase().trim();
    this.validateLocalPart(localPart);

    // Check uniqueness within domain
    const existing = await this.db.mailbox.findUnique({
      where: { domainId_localPart: { domainId: input.domainId, localPart } },
    });
    if (existing) {
      throw new ConflictError(
        `Mailbox "${localPart}@${domain.domain}" already exists`
      );
    }

    const emailAddress = buildEmailAddress(localPart, domain.domain);

    // Step 1: Provision account in Stalwart (BEFORE writing to DB)
    let stalwartId: string;
    try {
      stalwartId = await this.mailProvider.createAccount({
        email: emailAddress,
        displayName: input.displayName,
        password: input.password,
        quotaMb: input.storageQuotaMb ?? 5120,
      });
    } catch (err) {
      this.logger.error(
        { ...ctx, emailAddress, err },
        "Stalwart account creation failed"
      );
      throw err; // ExternalServiceError propagated from provider
    }

    // Step 2: Persist to DB only after Stalwart succeeds
    const mailbox = await this.db.mailbox.create({
      data: {
        workspaceId: ctx.workspaceId,
        domainId: input.domainId,
        localPart,
        displayName: input.displayName,
        stalwartId,
        storageQuotaMb: input.storageQuotaMb ?? 5120,
        isActive: true,
        userAccess: {
          create: {
            userId: ctx.userId,
            permission: "OWNER",
          },
        },
      },
      include: { domain: { select: { domain: true } }, aliases: true },
    });

    this.logger.info(
      { ...ctx, mailboxId: mailbox.id, email: emailAddress, stalwartId },
      "Mailbox created"
    );

    return mailbox as MailboxWithDomain;
  }

  // ─── List Mailboxes ───────────────────────────────────────────────────────

  async listMailboxes(
    ctx: RequestContext,
    filters?: { domainId?: string }
  ): Promise<MailboxWithDomain[]> {
    await this.workspaceService.assertMember(ctx);

    const mailboxes = await this.db.mailbox.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(filters?.domainId && { domainId: filters.domainId }),
      },
      include: { domain: { select: { domain: true } }, aliases: true },
      orderBy: { createdAt: "desc" },
    });

    return mailboxes as MailboxWithDomain[];
  }

  // ─── Get Mailbox ──────────────────────────────────────────────────────────

  async getMailbox(
    ctx: RequestContext,
    mailboxId: string
  ): Promise<MailboxWithDomain> {
    await this.workspaceService.assertMember(ctx);
    const mailbox = await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);
    return mailbox as MailboxWithDomain;
  }

  // ─── Update Mailbox ───────────────────────────────────────────────────────

  async updateMailbox(
    ctx: RequestContext,
    mailboxId: string,
    input: UpdateMailboxInput
  ): Promise<MailboxWithDomain> {
    await this.workspaceService.assertPermission(ctx, "mailbox:update");
    const mailbox = await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);

    // Sync to Stalwart
    await this.mailProvider.updateAccount(mailbox.stalwartId, {
      displayName: input.displayName,
      isActive: input.isActive,
      quotaMb: input.storageQuotaMb,
    });

    const updated = await this.db.mailbox.update({
      where: { id: mailboxId },
      data: input,
      include: { domain: { select: { domain: true } }, aliases: true },
    });

    return updated as MailboxWithDomain;
  }

  // ─── Reset Mailbox Password ───────────────────────────────────────────────

  async resetMailboxPassword(
    ctx: RequestContext,
    mailboxId: string,
    newPassword: string
  ): Promise<void> {
    await this.workspaceService.assertPermission(ctx, "mailbox:resetPassword");
    const mailbox = await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);

    await this.mailProvider.resetPassword(mailbox.stalwartId, newPassword);
    this.logger.info({ ...ctx, mailboxId }, "Mailbox password reset");
  }

  // ─── Delete Mailbox ───────────────────────────────────────────────────────

  async deleteMailbox(ctx: RequestContext, mailboxId: string): Promise<void> {
    await this.workspaceService.assertPermission(ctx, "mailbox:delete");
    const mailbox = await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);

    // Deprovision from Stalwart first
    try {
      await this.mailProvider.deleteAccount(mailbox.stalwartId);
    } catch (err) {
      this.logger.warn(
        { ...ctx, mailboxId, stalwartId: mailbox.stalwartId, err },
        "Stalwart account deletion failed — proceeding with DB deletion"
      );
    }

    await this.db.mailbox.delete({ where: { id: mailboxId } });
    this.logger.info(
      { ...ctx, mailboxId, stalwartId: mailbox.stalwartId },
      "Mailbox deleted"
    );
  }

  // ─── Aliases ──────────────────────────────────────────────────────────────

  async addAlias(
    ctx: RequestContext,
    mailboxId: string,
    alias: string
  ): Promise<MailboxAlias> {
    await this.workspaceService.assertPermission(ctx, "alias:create");
    const mailbox = await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);

    const normalizedAlias = alias.toLowerCase().trim();

    const existing = await this.db.mailboxAlias.findUnique({
      where: { alias: normalizedAlias },
    });
    if (existing) {
      throw new ConflictError(`Alias "${normalizedAlias}" already exists`);
    }

    await this.mailProvider.addAlias(mailbox.stalwartId, normalizedAlias);

    const created = await this.db.mailboxAlias.create({
      data: { mailboxId, alias: normalizedAlias },
    });

    this.logger.info(
      { ...ctx, mailboxId, alias: normalizedAlias },
      "Alias added"
    );

    return created;
  }

  async removeAlias(
    ctx: RequestContext,
    mailboxId: string,
    aliasId: string
  ): Promise<void> {
    await this.workspaceService.assertPermission(ctx, "alias:delete");
    const mailbox = await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);

    const alias = await this.db.mailboxAlias.findFirst({
      where: { id: aliasId, mailboxId },
    });
    if (!alias) throw new NotFoundError("Alias not found");

    await this.mailProvider.removeAlias(mailbox.stalwartId, alias.alias);
    await this.db.mailboxAlias.delete({ where: { id: aliasId } });

    this.logger.info({ ...ctx, mailboxId, aliasId, alias: alias.alias }, "Alias removed");
  }

  async listAliases(
    ctx: RequestContext,
    mailboxId: string
  ): Promise<MailboxAlias[]> {
    await this.workspaceService.assertMember(ctx);
    await this.assertMailboxBelongsToWorkspace(ctx, mailboxId);
    return this.db.mailboxAlias.findMany({ where: { mailboxId } });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async assertMailboxBelongsToWorkspace(
    ctx: RequestContext,
    mailboxId: string
  ) {
    const mailbox = await this.db.mailbox.findFirst({
      where: { id: mailboxId, workspaceId: ctx.workspaceId },
      include: { domain: { select: { domain: true } }, aliases: true },
    });
    if (!mailbox) throw new NotFoundError("Mailbox not found");
    return mailbox;
  }

  private validateLocalPart(localPart: string): void {
    // RFC 5321 local part validation (simplified)
    const localPartRegex = /^[a-z0-9][a-z0-9._+-]{0,62}$/;
    if (!localPartRegex.test(localPart)) {
      throw new ConflictError(
        `"${localPart}" is not a valid mailbox local part`
      );
    }
  }
}
