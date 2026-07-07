/**
 * VMailx — Emails Draft Route
 * POST /api/emails/draft  → save a draft
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { emailService } from "@/lib/container";

const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});

const SaveDraftSchema = z.object({
  mailboxId: z.string().uuid(),
  draftId: z.string().optional(), // if updating an existing draft
  to: z.array(EmailAddressSchema).optional().default([]),
  cc: z.array(EmailAddressSchema).optional(),
  bcc: z.array(EmailAddressSchema).optional(),
  subject: z.string().optional().default(""),
  bodyHtml: z.string().optional().default(""),
  bodyText: z.string().optional().default(""),
  replyToMessageId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/emails/draft");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = SaveDraftSchema.parse(await req.json());
    
    const { mailboxId, ...payload } = body;
    const result = await emailService.saveDraft(ctx, mailboxId, payload);
    
    logRequest(log, ctx, 201, start);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
