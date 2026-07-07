/**
 * VMailx — DomainService
 *
 * Ownership chain: User → Workspace → Domain → Stalwart
 *
 * All domain operations verify workspace permission before executing.
 * DKIM private keys are stored AES-256-GCM encrypted in PostgreSQL.
 */

import crypto from "crypto";
import dns from "dns/promises";
import type { PrismaClient, Domain } from "@prisma/client";
import { type Logger, type RequestContext } from "@/lib/logger";
import { type MailProvider } from "@/lib/providers/mail";
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
  UnprocessableError,
} from "@/lib/errors";
import { encrypt, decrypt } from "@/lib/utils";
import { WorkspaceService } from "@/services/workspace";

// ─── Input / Output Types ─────────────────────────────────────────────────────

export interface AddDomainInput {
  domain: string;
}

export type DomainWithRecords = Omit<Domain, "dkimPrivateKey">;

export interface DnsVerificationResult {
  domain: string;
  status: "VERIFIED" | "FAILED";
  checks: {
    mx: boolean;
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
  };
  failedChecks: string[];
}

// ─── DomainService ────────────────────────────────────────────────────────────

export class DomainService {
  constructor(
    private readonly db: PrismaClient,
    private readonly mailProvider: MailProvider,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: Logger
  ) {}

  // ─── Add Domain ───────────────────────────────────────────────────────────

  async addDomain(ctx: RequestContext, input: AddDomainInput): Promise<Domain> {
    await this.workspaceService.assertPermission(ctx, "domain:create");

    const normalizedDomain = input.domain.toLowerCase().trim();
    this.validateDomainFormat(normalizedDomain);

    const existing = await this.db.domain.findUnique({
      where: { domain: normalizedDomain },
    });
    if (existing) {
      throw new ConflictError(`Domain "${normalizedDomain}" is already registered`);
    }

    // Generate DKIM keypair
    const { publicKey, privateKey } = await this.generateDkimKeyPair();
    const encryptedPrivateKey = await encrypt(privateKey);

    // Build DNS records
    const selector = "mail";
    const records = this.buildDnsRecords(normalizedDomain, publicKey, selector);

    const domain = await this.db.domain.create({
      data: {
        workspaceId: ctx.workspaceId,
        domain: normalizedDomain,
        status: "PENDING",
        mxRecord: records.mx,
        spfRecord: records.spf,
        dkimPublicKey: publicKey,
        dkimPrivateKey: encryptedPrivateKey,
        dkimSelector: selector,
        dmarcRecord: records.dmarc,
      },
    });

    this.logger.info(
      { ...ctx, domainId: domain.id, domain: normalizedDomain },
      "Domain added"
    );

    return this.sanitize(domain);
  }

  // ─── List Domains ─────────────────────────────────────────────────────────

  async listDomains(ctx: RequestContext): Promise<Domain[]> {
    await this.workspaceService.assertMember(ctx);
    const domains = await this.db.domain.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return domains.map(this.sanitize);
  }

  // ─── Get Domain ───────────────────────────────────────────────────────────

  async getDomain(ctx: RequestContext, domainId: string): Promise<Domain> {
    await this.workspaceService.assertMember(ctx);
    const domain = await this.assertDomainBelongsToWorkspace(ctx, domainId);
    return this.sanitize(domain);
  }

  // ─── Verify Domain DNS ────────────────────────────────────────────────────

  async verifyDomain(
    ctx: RequestContext,
    domainId: string
  ): Promise<DnsVerificationResult> {
    await this.workspaceService.assertPermission(ctx, "domain:verify");
    const domain = await this.assertDomainBelongsToWorkspace(ctx, domainId);

    const checks = await this.runDnsChecks(domain);
    const allPassed = Object.values(checks).every(Boolean);
    const failedChecks = Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k.toUpperCase());

    const newStatus = allPassed ? "VERIFIED" : "FAILED";

    await this.db.domain.update({
      where: { id: domainId },
      data: {
        status: newStatus,
        lastCheckedAt: new Date(),
        ...(allPassed && { verifiedAt: new Date() }),
      },
    });

    // Register domain with Stalwart on successful verification
    if (allPassed && !domain.stalwartDomainId) {
      try {
        await this.mailProvider.addDomain(domain.domain);
        await this.db.domain.update({
          where: { id: domainId },
          data: { stalwartDomainId: domain.domain },
        });
      } catch (err) {
        this.logger.error(
          { ...ctx, domainId, err },
          "Failed to register domain with Stalwart"
        );
        throw new ExternalServiceError(
          "Domain DNS verified but failed to register with mail server. Please try again.",
          err
        );
      }
    } else if (!allPassed) {
      throw new UnprocessableError(
        `DNS verification failed. Missing: ${failedChecks.join(", ")}`,
        { checks, failedChecks }
      );
    }

    this.logger.info(
      { ...ctx, domainId, domain: domain.domain, status: newStatus },
      "Domain verification completed"
    );

    return {
      domain: domain.domain,
      status: newStatus,
      checks,
      failedChecks,
    };
  }

  // ─── Delete Domain ────────────────────────────────────────────────────────

  async deleteDomain(ctx: RequestContext, domainId: string): Promise<void> {
    await this.workspaceService.assertPermission(ctx, "domain:delete");
    const domain = await this.assertDomainBelongsToWorkspace(ctx, domainId);

    // Check for dependent mailboxes
    const mailboxCount = await this.db.mailbox.count({ where: { domainId } });
    if (mailboxCount > 0) {
      throw new UnprocessableError(
        `Cannot delete domain with ${mailboxCount} active mailbox(es). Delete mailboxes first.`
      );
    }

    // Remove from Stalwart if registered
    if (domain.stalwartDomainId) {
      try {
        await this.mailProvider.removeDomain(domain.domain);
      } catch (err) {
        this.logger.warn(
          { ...ctx, domainId, err },
          "Failed to remove domain from Stalwart — proceeding with DB deletion"
        );
      }
    }

    await this.db.domain.delete({ where: { id: domainId } });
    this.logger.info({ ...ctx, domainId, domain: domain.domain }, "Domain deleted");
  }

  // ─── Expose DKIM Private Key (for signing setup) ─────────────────────────

  async getDkimPrivateKey(ctx: RequestContext, domainId: string): Promise<string> {
    await this.workspaceService.assertPermission(ctx, "domain:verify");
    const domain = await this.assertDomainBelongsToWorkspace(ctx, domainId);
    return decrypt(domain.dkimPrivateKey);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async assertDomainBelongsToWorkspace(
    ctx: RequestContext,
    domainId: string
  ) {
    const domain = await this.db.domain.findFirst({
      where: { id: domainId, workspaceId: ctx.workspaceId },
    });
    if (!domain) throw new NotFoundError("Domain not found");
    return domain;
  }

  private async generateDkimKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        "rsa",
        {
          modulusLength: 2048,
          publicKeyEncoding: { type: "spki", format: "der" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        },
        (err, publicKey, privateKey) => {
          if (err) return reject(err);
          // DKIM requires raw base64 of DER-encoded public key
          const publicKeyBase64 = (publicKey as unknown as Buffer).toString("base64");
          resolve({ publicKey: publicKeyBase64, privateKey: privateKey as string });
        }
      );
    });
  }

  private buildDnsRecords(
    domain: string,
    dkimPublicKey: string,
    selector: string
  ) {
    return {
      mx: `10 mail.${domain}`,
      spf: `v=spf1 mx include:${domain} ~all`,
      dkim: `v=DKIM1; k=rsa; p=${dkimPublicKey}`,
      dkimHost: `${selector}._domainkey.${domain}`,
      dmarc: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      dmarcHost: `_dmarc.${domain}`,
    };
  }

  private async runDnsChecks(
    domain: { domain: string; mxRecord: string; spfRecord: string; dkimPublicKey: string; dkimSelector: string }
  ): Promise<{ mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean }> {
    const results = { mx: false, spf: false, dkim: false, dmarc: false };

    // MX check
    try {
      const mxRecords = await dns.resolveMx(domain.domain);
      results.mx = mxRecords.length > 0;
    } catch { results.mx = false; }

    // SPF check
    try {
      const txtRecords = await dns.resolveTxt(domain.domain);
      results.spf = txtRecords
        .flat()
        .some((r) => r.startsWith("v=spf1"));
    } catch { results.spf = false; }

    // DKIM check
    try {
      const dkimHost = `${domain.dkimSelector}._domainkey.${domain.domain}`;
      const txtRecords = await dns.resolveTxt(dkimHost);
      results.dkim = txtRecords
        .flat()
        .some((r) => r.includes("v=DKIM1") && r.includes(domain.dkimPublicKey.slice(0, 20)));
    } catch { results.dkim = false; }

    // DMARC check
    try {
      const dmarcHost = `_dmarc.${domain.domain}`;
      const txtRecords = await dns.resolveTxt(dmarcHost);
      results.dmarc = txtRecords
        .flat()
        .some((r) => r.startsWith("v=DMARC1"));
    } catch { results.dmarc = false; }

    return results;
  }

  private validateDomainFormat(domain: string): void {
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      throw new ConflictError(`"${domain}" is not a valid domain name`);
    }
  }

  /** Strip encrypted private key before returning domain to callers */
  private sanitize(domain: Domain): Domain {
    return { ...domain, dkimPrivateKey: "[REDACTED]" };
  }
}
