/**
 * VMailx — MailProvider Interface
 *
 * The single contract between the service layer and any mail backend.
 * Phase 1 implementation: StalwartMailProvider (JMAP + SMTP + Admin API).
 * Future: swap in any JMAP-compliant provider without changing service code.
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type EmailFolder =
  | "INBOX"
  | "SENT"
  | "DRAFTS"
  | "SPAM"
  | "TRASH"
  | "ARCHIVE";

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Provider-specific blob ID (JMAP blobId, etc.) */
  blobId: string;
}

export interface EmailSummary {
  /** Provider-assigned message ID */
  id: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  preview: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  threadId?: string;
  folder: EmailFolder;
  hasAttachments: boolean;
}

export interface EmailDetail extends EmailSummary {
  bcc: EmailAddress[];
  bodyHtml: string;
  bodyText: string;
  attachments: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
}

export interface EmailList {
  emails: EmailSummary[];
  total: number;
  /** Provider state token — used for delta sync */
  state: string;
}

export interface EmailChanges {
  created: string[];
  updated: string[];
  destroyed: string[];
  newState: string;
}

// ─── Query / Filter Params ────────────────────────────────────────────────────

export interface ListEmailsParams {
  /** Stalwart account ID (stalwartId from Mailbox record) */
  accountId: string;
  folder?: EmailFolder;
  limit?: number;
  position?: number;
  /** JMAP state token for delta sync */
  sinceState?: string;
}

export interface SearchEmailsParams {
  accountId: string;
  query: string;
  folder?: EmailFolder;
  from?: string;
  subject?: string;
  after?: Date;
  before?: Date;
  limit?: number;
}

// ─── Send / Draft ─────────────────────────────────────────────────────────────

export interface SendEmailPayload {
  /** Full from address: "Name <email>" or just "email" */
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  replyToMessageId?: string;
  /** Pre-uploaded attachment blob IDs */
  attachmentBlobIds?: string[];
}

export interface SendEmailResult {
  messageId: string;
}

export interface DraftPayload extends Omit<SendEmailPayload, "from"> {
  accountId: string;
  from: EmailAddress;
  /** If provided, update existing draft */
  draftId?: string;
}

export interface DraftResult {
  draftId: string;
}

// ─── Account Provisioning ─────────────────────────────────────────────────────

export interface CreateAccountParams {
  /** Full email address: hello@example.com */
  email: string;
  displayName: string;
  password: string;
  /** Storage quota in MB */
  quotaMb?: number;
}

export interface UpdateAccountParams {
  displayName?: string;
  isActive?: boolean;
  quotaMb?: number;
}

// ─── MailProvider Interface ───────────────────────────────────────────────────

export interface MailProvider {
  // ── Email operations (JMAP) ──────────────────────────────────────────────

  listEmails(params: ListEmailsParams): Promise<EmailList>;
  getEmailChanges(accountId: string, sinceState: string): Promise<EmailChanges>;
  getEmail(accountId: string, emailId: string): Promise<EmailDetail>;
  searchEmails(params: SearchEmailsParams): Promise<EmailList>;

  markRead(accountId: string, emailId: string, isRead: boolean): Promise<void>;
  markStarred(
    accountId: string,
    emailId: string,
    isStarred: boolean
  ): Promise<void>;
  moveToFolder(
    accountId: string,
    emailId: string,
    folder: EmailFolder
  ): Promise<void>;
  deleteEmail(accountId: string, emailId: string): Promise<void>;

  // ── Send / Draft (SMTP / JMAP) ───────────────────────────────────────────

  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
  saveDraft(payload: DraftPayload): Promise<DraftResult>;
  updateDraft(
    accountId: string,
    draftId: string,
    payload: Partial<DraftPayload>
  ): Promise<DraftResult>;
  deleteDraft(accountId: string, draftId: string): Promise<void>;

  // ── Account provisioning (Admin API) ─────────────────────────────────────

  createAccount(params: CreateAccountParams): Promise<string>;
  updateAccount(id: string, params: UpdateAccountParams): Promise<void>;
  resetPassword(id: string, newPassword: string): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  addAlias(accountId: string, alias: string): Promise<void>;
  removeAlias(accountId: string, alias: string): Promise<void>;

  addDomain(domain: string): Promise<void>;
  removeDomain(domain: string): Promise<void>;
}
