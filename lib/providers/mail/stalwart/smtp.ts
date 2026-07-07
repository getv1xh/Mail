/**
 * VMailx — Stalwart SMTP Client
 *
 * Handles outbound email sending via Stalwart's SMTP port.
 * Uses nodemailer under the hood.
 */

import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { type SendEmailPayload, type SendEmailResult } from "@/lib/providers/mail/index";
import { ExternalServiceError } from "@/lib/errors";

export interface StalwartSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export class StalwartSmtpClient {
  private readonly transporter: nodemailer.Transporter;

  constructor(config: StalwartSmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        // Allow self-signed certs in dev
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const mailOptions: Mail.Options = {
      from: payload.from.name
        ? `"${payload.from.name}" <${payload.from.email}>`
        : payload.from.email,
      to: payload.to.map((a) =>
        a.name ? `"${a.name}" <${a.email}>` : a.email
      ),
      cc: payload.cc?.map((a) =>
        a.name ? `"${a.name}" <${a.email}>` : a.email
      ),
      bcc: payload.bcc?.map((a) =>
        a.name ? `"${a.name}" <${a.email}>` : a.email
      ),
      subject: payload.subject,
      html: payload.bodyHtml,
      text: payload.bodyText,
      ...(payload.replyToMessageId && {
        inReplyTo: payload.replyToMessageId,
        references: payload.replyToMessageId,
      }),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { messageId: info.messageId };
    } catch (err) {
      throw new ExternalServiceError(
        "Failed to send email via SMTP",
        err instanceof Error ? err.message : err
      );
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
