/**
 * VMailx — EmailService
 *
 * Ownership chain: User → Workspace → Mailbox (access check) → Stalwart (JMAP/SMTP)
 *
 * Stalwart is the single source of truth for all email data.
 * This service validates user access to a mailbox before proxying any JMAP calls.
 */

import type { PrismaClient } from "@prisma/client";
import { type Logger, type RequestContext } from "@/lib/logger";
import {
  type MailProvider,
  type EmailList,
  type EmailDetail,
  type EmailFolder,
  type SendEmailPayload,
  type SendEmailResult,
  type DraftPayload,
  type DraftResult,
  type SearchEmailsParams,
} from "@/lib/providers/mail";
import { type StorageProvider } from "@/lib/providers/storage";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  type MailboxPermission,
  type MailboxAction,
  canPerformMailboxAction,
} from "@/lib/rbac";
import { WorkspaceService } from "@/services/workspace";

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface ListEmailsInput {
  mailboxId: string;
  folder?: EmailFolder;
  limit?: number;
  position?: number;
  sinceState?: string;
}

export interface GetEmailInput {
  mailboxId: string;
  emailId: string;
}

export interface SendInput {
  mailboxId: string;
  payload: Omit<SendEmailPayload, "from">;
}

export interface SearchInput extends Omit<SearchEmailsParams, "accountId"> {
  mailboxId: string;
}

// ─── EmailService ──────────────────────────────────────────────────────────────

export class EmailService {
  constructor(
    private readonly db: PrismaClient,
    private readonly mailProvider: MailProvider,
    private readonly storageProvider: StorageProvider,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: Logger
  ) {}

  // ─── List Emails ──────────────────────────────────────────────────────────

  async listEmails(ctx: RequestContext, input: ListEmailsInput): Promise<EmailList> {
    const stalwartId = await this.assertMailboxAccess(ctx, input.mailboxId, "email:read");

    return this.mailProvider.listEmails({
      accountId: stalwartId,
      folder: input.folder,
      limit: input.limit,
      position: input.position,
      sinceState: input.sinceState,
    });
  }

  // ─── Get Email ────────────────────────────────────────────────────────────

  async getEmail(ctx: RequestContext, input: GetEmailInput): Promise<EmailDetail> {
    const stalwartId = await this.assertMailboxAccess(ctx, input.mailboxId, "email:read");

    const email = await this.mailProvider.getEmail(stalwartId, input.emailId);

    // Auto-mark as read on open
    await this.mailProvider.markRead(stalwartId, input.emailId, true).catch(() => {
      // Non-fatal — don't block email display if mark-read fails
    });

    return email;
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  async searchEmails(ctx: RequestContext, input: SearchInput): Promise<EmailList> {
    const stalwartId = await this.assertMailboxAccess(ctx, input.mailboxId, "email:read");

    return this.mailProvider.searchEmails({
      ...input,
      accountId: stalwartId,
    });
  }

  // ─── Send Email ───────────────────────────────────────────────────────────

  async sendEmail(ctx: RequestContext, input: SendInput): Promise<SendEmailResult> {
    const { stalwartId, mailbox } = await this.assertMailboxAccessWithMailbox(
      ctx,
      input.mailboxId,
      "email:send"
    );

    // Resolve domain for from address
    const domain = await this.db.domain.findUnique({
      where: { id: mailbox.domainId },
    });
    if (!domain) throw new NotFoundError("Domain not found for mailbox");

    const fromAddress = `${mailbox.localPart}@${domain.domain}`;
    const result = await this.mailProvider.sendEmail({
      ...input.payload,
      from: { name: mailbox.displayName, email: fromAddress },
    });

    this.logger.info(
      { ...ctx, mailboxId: input.mailboxId, messageId: result.messageId },
      "Email sent"
    );

    return result;
  }

  // ─── Draft ────────────────────────────────────────────────────────────────

  async saveDraft(
    ctx: RequestContext,
    mailboxId: string,
    payload: Omit<DraftPayload, "accountId" | "from">
  ): Promise<DraftResult> {
    const { stalwartId, mailbox } = await this.assertMailboxAccessWithMailbox(
      ctx,
      mailboxId,
      "email:send"
    );

    const domain = await this.db.domain.findUnique({
      where: { id: mailbox.domainId },
    });
    if (!domain) throw new NotFoundError("Domain not found for mailbox");

    return this.mailProvider.saveDraft({
      ...payload,
      accountId: stalwartId,
      from: { name: mailbox.displayName, email: `${mailbox.localPart}@${domain.domain}` },
    });
  }

  // ─── Mark Read / Starred ──────────────────────────────────────────────────

  async markRead(
    ctx: RequestContext,
    mailboxId: string,
    emailId: string,
    isRead: boolean
  ): Promise<void> {
    const stalwartId = await this.assertMailboxAccess(ctx, mailboxId, "email:read");
    await this.mailProvider.markRead(stalwartId, emailId, isRead);
  }

  async markStarred(
    ctx: RequestContext,
    mailboxId: string,
    emailId: string,
    isStarred: boolean
  ): Promise<void> {
    const stalwartId = await this.assertMailboxAccess(ctx, mailboxId, "email:read");
    await this.mailProvider.markStarred(stalwartId, emailId, isStarred);
  }

  // ─── Move / Delete ────────────────────────────────────────────────────────

  async moveToFolder(
    ctx: RequestContext,
    mailboxId: string,
    emailId: string,
    folder: EmailFolder
  ): Promise<void> {
    const stalwartId = await this.assertMailboxAccess(ctx, mailboxId, "email:read");
    await this.mailProvider.moveToFolder(stalwartId, emailId, folder);
  }

  async deleteEmail(
    ctx: RequestContext,
    mailboxId: string,
    emailId: string
  ): Promise<void> {
    const stalwartId = await this.assertMailboxAccess(ctx, mailboxId, "email:delete");
    await this.mailProvider.deleteEmail(stalwartId, emailId);

    this.logger.info({ ...ctx, mailboxId, emailId }, "Email deleted");
  }

  // ─── Private: Access Control ───────────────────────────────────────────────

  /**
   * Validates User → Workspace → Mailbox access chain.
   * Returns the Stalwart account ID (stalwartId) for use in JMAP calls.
   */
  private async assertMailboxAccess(
    ctx: RequestContext,
    mailboxId: string,
    action: MailboxAction
  ): Promise<string> {
    const { stalwartId } = await this.assertMailboxAccessWithMailbox(ctx, mailboxId, action);
    return stalwartId;
  }

  private async assertMailboxAccessWithMailbox(
    ctx: RequestContext,
    mailboxId: string,
    action: MailboxAction
  ): Promise<{ stalwartId: string; mailbox: { localPart: string; displayName: string; domainId: string } }> {
    // 1. Verify workspace membership
    await this.workspaceService.assertMember(ctx);

    // 2. Verify mailbox belongs to workspace
    const mailbox = await this.db.mailbox.findFirst({
      where: { id: mailboxId, workspaceId: ctx.workspaceId },
    });
    if (!mailbox) throw new NotFoundError("Mailbox not found");

    if (!mailbox.isActive) {
      throw new ForbiddenError("This mailbox is disabled");
    }

    // 3. Verify user has sufficient mailbox permission
    const access = await this.db.mailboxUserAccess.findUnique({
      where: { mailboxId_userId: { mailboxId, userId: ctx.userId } },
    });
    if (!access) {
      throw new ForbiddenError("You do not have access to this mailbox");
    }
    if (!canPerformMailboxAction(access.permission as MailboxPermission, action)) {
      throw new ForbiddenError(
        `Permission level "${access.permission}" cannot perform: ${action}`
      );
    }

    return { stalwartId: mailbox.stalwartId, mailbox };
  }
}
