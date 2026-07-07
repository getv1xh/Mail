/**
 * VMailx — Dependency Injection Container
 *
 * Single place to wire providers to services.
 * To swap a provider (e.g. Stalwart → another mail server), change this file only.
 * Services depend on interfaces — they never import concrete implementations.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { StalwartMailProvider } from "@/lib/providers/mail/stalwart";
import { LocalStorageProvider } from "@/lib/providers/storage/local";
import { WorkspaceService } from "@/services/workspace";
import { DomainService } from "@/services/domain";
import { MailboxService } from "@/services/mailbox";
import { EmailService } from "@/services/email";
import { AuthService } from "@/services/auth";
import { InvitationService } from "@/services/invitation";

// ─── Validate required environment variables ──────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ─── Provider Instances ───────────────────────────────────────────────────────

const mailProvider = new StalwartMailProvider({
  adminUrl: process.env.STALWART_ADMIN_URL ?? "http://localhost:8080",
  adminToken: process.env.STALWART_ADMIN_TOKEN ?? "dev-token",
  jmapUrl: process.env.STALWART_JMAP_URL ?? "http://localhost:8080/jmap",
  smtpHost: process.env.SMTP_HOST ?? "localhost",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
});

const storageProvider = new LocalStorageProvider({
  basePath: process.env.STORAGE_PATH ?? "./uploads",
});

// ─── Service Instances ────────────────────────────────────────────────────────

export const workspaceService = new WorkspaceService(db, logger);

export const domainService = new DomainService(
  db,
  mailProvider,
  workspaceService,
  logger
);

export const mailboxService = new MailboxService(
  db,
  mailProvider,
  workspaceService,
  logger
);

export const emailService = new EmailService(
  db,
  mailProvider,
  storageProvider,
  workspaceService,
  logger
);

export const authService = new AuthService(db, logger);

export const invitationService = new InvitationService(db, logger);
