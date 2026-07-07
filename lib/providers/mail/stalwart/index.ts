/**
 * VMailx — StalwartMailProvider
 *
 * Implements the MailProvider interface using:
 *   - JMAP for reading/searching/managing email (StalwartJmapClient)
 *   - SMTP for sending email (StalwartSmtpClient)
 *   - REST Admin API for account/domain/alias provisioning (StalwartAdminClient)
 *
 * This is the ONLY class that imports from the sub-clients.
 * The service layer only depends on the MailProvider interface.
 */

import {
  type MailProvider,
  type ListEmailsParams,
  type SearchEmailsParams,
  type EmailList,
  type EmailDetail,
  type EmailChanges,
  type EmailFolder,
  type SendEmailPayload,
  type SendEmailResult,
  type DraftPayload,
  type DraftResult,
  type CreateAccountParams,
  type UpdateAccountParams,
} from "@/lib/providers/mail/index";
import { StalwartJmapClient } from "./jmap";
import { StalwartSmtpClient } from "./smtp";
import { StalwartAdminClient } from "./admin";

export interface StalwartMailProviderConfig {
  adminUrl: string;
  adminToken: string;
  jmapUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

export class StalwartMailProvider implements MailProvider {
  private readonly jmap: StalwartJmapClient;
  private readonly smtp: StalwartSmtpClient;
  private readonly admin: StalwartAdminClient;

  constructor(config: StalwartMailProviderConfig) {
    this.jmap = new StalwartJmapClient({
      jmapUrl: config.jmapUrl,
      adminToken: config.adminToken,
    });
    this.smtp = new StalwartSmtpClient({
      host: config.smtpHost,
      port: config.smtpPort,
      user: config.smtpUser,
      pass: config.smtpPass,
    });
    this.admin = new StalwartAdminClient({
      adminUrl: config.adminUrl,
      adminToken: config.adminToken,
    });
  }

  // ── JMAP — Email read ──────────────────────────────────────────────────────

  listEmails(params: ListEmailsParams): Promise<EmailList> {
    return this.jmap.listEmails(params);
  }

  getEmailChanges(accountId: string, sinceState: string): Promise<EmailChanges> {
    return this.jmap.getEmailChanges(accountId, sinceState);
  }

  getEmail(accountId: string, emailId: string): Promise<EmailDetail> {
    return this.jmap.getEmail(accountId, emailId);
  }

  searchEmails(params: SearchEmailsParams): Promise<EmailList> {
    return this.jmap.searchEmails(params);
  }

  markRead(accountId: string, emailId: string, isRead: boolean): Promise<void> {
    return this.jmap.markRead(accountId, emailId, isRead);
  }

  markStarred(accountId: string, emailId: string, isStarred: boolean): Promise<void> {
    return this.jmap.markStarred(accountId, emailId, isStarred);
  }

  moveToFolder(accountId: string, emailId: string, folder: EmailFolder): Promise<void> {
    return this.jmap.moveToFolder(accountId, emailId, folder);
  }

  deleteEmail(accountId: string, emailId: string): Promise<void> {
    return this.jmap.deleteEmail(accountId, emailId);
  }

  // ── SMTP — Send ────────────────────────────────────────────────────────────

  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    return this.smtp.sendEmail(payload);
  }

  // ── Draft — Placeholder (JMAP draft management) ───────────────────────────
  // Full draft JMAP implementation is straightforward — create email with $draft keyword

  async saveDraft(payload: DraftPayload): Promise<DraftResult> {
    // TODO: implement via JMAP Email/set with $draft keyword
    // Returning a stub to satisfy the interface contract
    void payload;
    throw new Error("saveDraft: not yet implemented");
  }

  async updateDraft(
    accountId: string,
    draftId: string,
    payload: Partial<DraftPayload>
  ): Promise<DraftResult> {
    void accountId; void draftId; void payload;
    throw new Error("updateDraft: not yet implemented");
  }

  async deleteDraft(accountId: string, draftId: string): Promise<void> {
    return this.jmap.deleteEmail(accountId, draftId);
  }

  // ── Admin API — Account provisioning ──────────────────────────────────────

  createAccount(params: CreateAccountParams): Promise<string> {
    return this.admin.createAccount(params);
  }

  updateAccount(id: string, params: UpdateAccountParams): Promise<void> {
    return this.admin.updateAccount(id, params);
  }

  resetPassword(id: string, newPassword: string): Promise<void> {
    return this.admin.resetPassword(id, newPassword);
  }

  deleteAccount(id: string): Promise<void> {
    return this.admin.deleteAccount(id);
  }

  addAlias(accountId: string, alias: string): Promise<void> {
    return this.admin.addAlias(accountId, alias);
  }

  removeAlias(accountId: string, alias: string): Promise<void> {
    return this.admin.removeAlias(accountId, alias);
  }

  addDomain(domain: string): Promise<void> {
    return this.admin.addDomain(domain);
  }

  removeDomain(domain: string): Promise<void> {
    return this.admin.removeDomain(domain);
  }
}
