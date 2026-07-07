/**
 * VMailx — Stalwart JMAP Client
 *
 * Implements JMAP Core + JMAP Mail for reading, searching and managing emails.
 * RFC 8620 (JMAP Core): https://datatracker.ietf.org/doc/html/rfc8620
 * RFC 8621 (JMAP Mail): https://datatracker.ietf.org/doc/html/rfc8621
 *
 * Stalwart JMAP docs: https://stalw.art/docs/jmap/overview
 */

import {
  type EmailDetail,
  type EmailFolder,
  type EmailList,
  type EmailSummary,
  type EmailChanges,
  type ListEmailsParams,
  type SearchEmailsParams,
} from "@/lib/providers/mail/index";
import { ExternalServiceError } from "@/lib/errors";

export interface StalwartJmapConfig {
  jmapUrl: string;
  adminToken: string;
}

// Maps our folder enum to JMAP mailbox roles
const FOLDER_ROLE_MAP: Record<EmailFolder, string> = {
  INBOX: "inbox",
  SENT: "sent",
  DRAFTS: "drafts",
  SPAM: "junk",
  TRASH: "trash",
  ARCHIVE: "archive",
};

interface JmapSession {
  accountId: string;
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  state: string;
  mailboxes: Record<string, { id: string; role: string | null; name: string }>;
}

export class StalwartJmapClient {
  private readonly jmapUrl: string;
  private readonly headers: Record<string, string>;
  private sessionCache: Map<string, JmapSession> = new Map();

  constructor(config: StalwartJmapConfig) {
    this.jmapUrl = config.jmapUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.adminToken}`,
    };
  }

  // ─── Session ───────────────────────────────────────────────────────────────

  private async getSession(accountId: string): Promise<JmapSession> {
    if (this.sessionCache.has(accountId)) {
      return this.sessionCache.get(accountId)!;
    }

    const res = await fetch(`${this.jmapUrl}/.well-known/jmap`, {
      headers: { ...this.headers, "X-JMAP-AccountId": accountId },
    });

    if (!res.ok) {
      throw new ExternalServiceError("Failed to fetch JMAP session", res.status);
    }

    const data = await res.json();
    const primaryAccountId: string =
      data.primaryAccounts?.["urn:ietf:params:jmap:mail"] ?? accountId;

    // Fetch mailbox list to build folder → mailbox ID map
    const mailboxes = await this.fetchMailboxes(data.apiUrl, primaryAccountId);

    const session: JmapSession = {
      accountId: primaryAccountId,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
      uploadUrl: data.uploadUrl,
      state: data.state ?? "",
      mailboxes,
    };

    this.sessionCache.set(accountId, session);
    return session;
  }

  private async fetchMailboxes(
    apiUrl: string,
    accountId: string
  ): Promise<JmapSession["mailboxes"]> {
    const response = await this.callJmap(apiUrl, [
      [
        "Mailbox/get",
        { accountId, ids: null },
        "0",
      ],
    ]);

    const result = response.methodResponses[0];
    if (!result || result[0] !== "Mailbox/get") return {};

    const mailboxMap: JmapSession["mailboxes"] = {};
    for (const mbox of (result[1] as any).list ?? []) {
      mailboxMap[mbox.id] = {
        id: mbox.id,
        role: mbox.role ?? null,
        name: mbox.name,
      };
    }
    return mailboxMap;
  }

  private getMailboxIdForFolder(
    session: JmapSession,
    folder: EmailFolder
  ): string | null {
    const role = FOLDER_ROLE_MAP[folder];
    for (const mbox of Object.values(session.mailboxes)) {
      if (mbox.role === role) return mbox.id;
    }
    return null;
  }

  // ─── List Emails ───────────────────────────────────────────────────────────

  async listEmails(params: ListEmailsParams): Promise<EmailList> {
    const session = await this.getSession(params.accountId);

    const filter: Record<string, unknown> = {};
    if (params.folder) {
      const mailboxId = this.getMailboxIdForFolder(session, params.folder);
      if (mailboxId) filter.inMailbox = mailboxId;
    }

    const response = await this.callJmap(session.apiUrl, [
      [
        "Email/query",
        {
          accountId: session.accountId,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: params.limit ?? 50,
          position: params.position ?? 0,
        },
        "0",
      ],
      [
        "Email/get",
        {
          accountId: session.accountId,
          "#ids": {
            resultOf: "0",
            name: "Email/query",
            path: "/ids",
          },
          properties: [
            "id",
            "subject",
            "from",
            "to",
            "cc",
            "receivedAt",
            "preview",
            "keywords",
            "threadId",
            "mailboxIds",
            "hasAttachment",
          ],
        },
        "1",
      ],
    ]);

    const queryResult = response.methodResponses.find(
      (r: unknown[]) => r[2] === "0"
    );
    const getResult = response.methodResponses.find(
      (r: unknown[]) => r[2] === "1"
    );

    const total: number = (queryResult?.[1] as any)?.total ?? 0;
    const emails: EmailSummary[] = ((getResult?.[1] as any)?.list ?? []).map(
      (e: Record<string, unknown>) =>
        this.mapToEmailSummary(e, session, params.folder)
    );

    return { emails, total, state: session.state };
  }

  // ─── Get Email Changes (Delta Sync) ────────────────────────────────────────

  async getEmailChanges(
    accountId: string,
    sinceState: string
  ): Promise<EmailChanges> {
    const session = await this.getSession(accountId);

    const response = await this.callJmap(session.apiUrl, [
      [
        "Email/changes",
        {
          accountId: session.accountId,
          sinceState,
          maxChanges: 100,
        },
        "0",
      ],
    ]);

    const result = response.methodResponses[0];
    if (!result || result[0] !== "Email/changes") {
      throw new ExternalServiceError("Unexpected JMAP response for Email/changes");
    }

    return {
      created: result[1].created ?? [],
      updated: result[1].updated ?? [],
      destroyed: result[1].destroyed ?? [],
      newState: result[1].newState,
    };
  }

  // ─── Get Single Email ───────────────────────────────────────────────────────

  async getEmail(accountId: string, emailId: string): Promise<EmailDetail> {
    const session = await this.getSession(accountId);

    const response = await this.callJmap(session.apiUrl, [
      [
        "Email/get",
        {
          accountId: session.accountId,
          ids: [emailId],
          properties: [
            "id",
            "subject",
            "from",
            "to",
            "cc",
            "bcc",
            "receivedAt",
            "preview",
            "keywords",
            "threadId",
            "mailboxIds",
            "hasAttachment",
            "bodyValues",
            "htmlBody",
            "textBody",
            "attachments",
            "inReplyTo",
            "references",
          ],
          bodyProperties: ["partId", "blobId", "size", "name", "type", "charset"],
          fetchHTMLBodyValues: true,
          fetchTextBodyValues: true,
          maxBodyValueBytes: 1048576, // 1 MB
        },
        "0",
      ],
    ]);

    const result = response.methodResponses[0];
    const emailData = result?.[1]?.list?.[0];
    if (!emailData) {
      throw new ExternalServiceError(`Email ${emailId} not found in JMAP response`);
    }

    return this.mapToEmailDetail(emailData, session);
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  async searchEmails(params: SearchEmailsParams): Promise<EmailList> {
    const session = await this.getSession(params.accountId);

    const filter: Record<string, unknown> = {};
    if (params.query) filter.text = params.query;
    if (params.from) filter.from = params.from;
    if (params.subject) filter.subject = params.subject;
    if (params.after) filter.after = params.after.toISOString();
    if (params.before) filter.before = params.before.toISOString();
    if (params.folder) {
      const mailboxId = this.getMailboxIdForFolder(session, params.folder);
      if (mailboxId) filter.inMailbox = mailboxId;
    }

    const response = await this.callJmap(session.apiUrl, [
      [
        "Email/query",
        {
          accountId: session.accountId,
          filter,
          sort: [{ property: "receivedAt", isAscending: false }],
          limit: params.limit ?? 50,
        },
        "0",
      ],
      [
        "Email/get",
        {
          accountId: session.accountId,
          "#ids": { resultOf: "0", name: "Email/query", path: "/ids" },
          properties: [
            "id", "subject", "from", "to", "cc",
            "receivedAt", "preview", "keywords", "threadId",
            "mailboxIds", "hasAttachment",
          ],
        },
        "1",
      ],
    ]);

    const queryResult = response.methodResponses.find(
      (r: unknown[]) => r[2] === "0"
    );
    const getResult = response.methodResponses.find(
      (r: unknown[]) => r[2] === "1"
    );

    const emails = (getResult?.[1]?.list ?? []).map(
      (e: Record<string, unknown>) => this.mapToEmailSummary(e, session)
    );

    return {
      emails,
      total: queryResult?.[1]?.total ?? emails.length,
      state: session.state,
    };
  }

  // ─── Email Mutations ───────────────────────────────────────────────────────

  async markRead(
    accountId: string,
    emailId: string,
    isRead: boolean
  ): Promise<void> {
    const session = await this.getSession(accountId);
    await this.callJmap(session.apiUrl, [
      [
        "Email/set",
        {
          accountId: session.accountId,
          update: {
            [emailId]: {
              "keywords/$seen": isRead ? true : null,
            },
          },
        },
        "0",
      ],
    ]);
  }

  async markStarred(
    accountId: string,
    emailId: string,
    isStarred: boolean
  ): Promise<void> {
    const session = await this.getSession(accountId);
    await this.callJmap(session.apiUrl, [
      [
        "Email/set",
        {
          accountId: session.accountId,
          update: {
            [emailId]: {
              "keywords/$flagged": isStarred ? true : null,
            },
          },
        },
        "0",
      ],
    ]);
  }

  async moveToFolder(
    accountId: string,
    emailId: string,
    folder: EmailFolder
  ): Promise<void> {
    const session = await this.getSession(accountId);
    const targetMailboxId = this.getMailboxIdForFolder(session, folder);
    if (!targetMailboxId) {
      throw new ExternalServiceError(`No JMAP mailbox found for folder: ${folder}`);
    }

    // Build mailboxIds patch: remove from all, add to target
    const currentMailboxIds = Object.fromEntries(
      Object.keys(session.mailboxes).map((id) => [`mailboxIds/${id}`, null])
    );
    currentMailboxIds[`mailboxIds/${targetMailboxId}`] = true;

    await this.callJmap(session.apiUrl, [
      [
        "Email/set",
        {
          accountId: session.accountId,
          update: { [emailId]: currentMailboxIds },
        },
        "0",
      ],
    ]);
  }

  async deleteEmail(accountId: string, emailId: string): Promise<void> {
    const session = await this.getSession(accountId);
    await this.callJmap(session.apiUrl, [
      [
        "Email/set",
        {
          accountId: session.accountId,
          destroy: [emailId],
        },
        "0",
      ],
    ]);
  }

  // ─── JMAP HTTP ─────────────────────────────────────────────────────────────

  private async callJmap(
    apiUrl: string,
    methodCalls: unknown[]
  ): Promise<{ methodResponses: unknown[][] }> {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        using: [
          "urn:ietf:params:jmap:core",
          "urn:ietf:params:jmap:mail",
        ],
        methodCalls,
      }),
    });

    if (!res.ok) {
      throw new ExternalServiceError(
        `JMAP request failed: ${res.status}`,
        await res.text()
      );
    }

    return res.json();
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private mapToEmailSummary(
    e: Record<string, unknown>,
    session: JmapSession,
    folder?: EmailFolder
  ): EmailSummary {
    const keywords = (e.keywords as Record<string, boolean>) ?? {};
    const mailboxIds = Object.keys(
      (e.mailboxIds as Record<string, boolean>) ?? {}
    );

    // Determine folder from mailboxIds if not passed explicitly
    let resolvedFolder: EmailFolder = folder ?? "INBOX";
    if (!folder) {
      for (const mboxId of mailboxIds) {
        const role = session.mailboxes[mboxId]?.role;
        if (role) {
          const entry = Object.entries(FOLDER_ROLE_MAP).find(
            ([, v]) => v === role
          );
          if (entry) {
            resolvedFolder = entry[0] as EmailFolder;
            break;
          }
        }
      }
    }

    const fromArr = (e.from as { name?: string; email: string }[]) ?? [];
    const from = fromArr[0] ?? { email: "unknown@unknown.com" };

    return {
      id: e.id as string,
      subject: (e.subject as string) ?? "(no subject)",
      from,
      to: (e.to as { name?: string; email: string }[]) ?? [],
      cc: (e.cc as { name?: string; email: string }[]) ?? [],
      preview: (e.preview as string) ?? "",
      receivedAt: new Date((e.receivedAt as string) ?? Date.now()),
      isRead: !!keywords["$seen"],
      isStarred: !!keywords["$flagged"],
      isDraft: !!keywords["$draft"],
      threadId: e.threadId as string | undefined,
      folder: resolvedFolder,
      hasAttachments: !!(e.hasAttachment as boolean),
    };
  }

  private mapToEmailDetail(
    e: Record<string, unknown>,
    session: JmapSession
  ): EmailDetail {
    const summary = this.mapToEmailSummary(e, session);
    const bodyValues = (e.bodyValues as Record<string, { value: string }>) ?? {};

    const htmlParts = (e.htmlBody as { partId: string }[]) ?? [];
    const textParts = (e.textBody as { partId: string }[]) ?? [];

    const bodyHtml = htmlParts
      .map((p) => bodyValues[p.partId]?.value ?? "")
      .join("");
    const bodyText = textParts
      .map((p) => bodyValues[p.partId]?.value ?? "")
      .join("");

    const attachments = (
      (e.attachments as {
        blobId: string;
        name?: string;
        type?: string;
        size?: number;
      }[]) ?? []
    ).map((a) => ({
      filename: a.name ?? "attachment",
      mimeType: a.type ?? "application/octet-stream",
      sizeBytes: a.size ?? 0,
      blobId: a.blobId,
    }));

    return {
      ...summary,
      bcc: (e.bcc as { name?: string; email: string }[]) ?? [],
      bodyHtml,
      bodyText,
      attachments,
      inReplyTo: e.inReplyTo as string | undefined,
      references: e.references as string[] | undefined,
    };
  }
}
