/**
 * VMailx — Emails API Routes
 * GET  /api/emails  → list emails
 * POST /api/emails  → send an email
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext, parsePagination } from "@/lib/route-helpers";
import { handleError, ValidationError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { emailService } from "@/lib/container";

const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});

const SendEmailSchema = z.object({
  mailboxId: z.string().uuid(),
  to: z.array(EmailAddressSchema).min(1),
  cc: z.array(EmailAddressSchema).optional(),
  bcc: z.array(EmailAddressSchema).optional(),
  subject: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string(),
  replyToMessageId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const log = routeLogger("GET /api/emails");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const searchParams = req.nextUrl.searchParams;
    const mailboxId = searchParams.get("mailboxId");
    if (!mailboxId) {
      throw new ValidationError("mailboxId is required");
    }
    
    const folder = searchParams.get("folder") as any;
    const sinceState = searchParams.get("sinceState") ?? undefined;
    const { limit, position } = parsePagination(searchParams);
    
    const emails = await emailService.listEmails(ctx, {
      mailboxId,
      folder,
      limit,
      position,
      sinceState,
    });
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(emails);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/emails");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = SendEmailSchema.parse(await req.json());
    
    const { mailboxId, ...payload } = body;
    const result = await emailService.sendEmail(ctx, { mailboxId, payload });
    
    logRequest(log, ctx, 201, start);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
