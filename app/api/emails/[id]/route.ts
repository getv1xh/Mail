/**
 * VMailx — Email Detail, Update, and Delete Routes
 * GET    /api/emails/[id]  → get email details
 * PATCH  /api/emails/[id]  → mark read/starred, move folder
 * DELETE /api/emails/[id]  → delete email
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError, ValidationError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { emailService } from "@/lib/container";

const UpdateEmailSchema = z.object({
  mailboxId: z.string().uuid(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  folder: z.enum(["INBOX", "SENT", "DRAFTS", "SPAM", "TRASH", "ARCHIVE"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("GET /api/emails/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const mailboxId = req.nextUrl.searchParams.get("mailboxId");
    if (!mailboxId) {
      throw new ValidationError("mailboxId is required");
    }
    
    const email = await emailService.getEmail(ctx, { mailboxId, emailId: id });
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(email);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("PATCH /api/emails/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = UpdateEmailSchema.parse(await req.json());
    
    if (body.isRead !== undefined) {
      await emailService.markRead(ctx, body.mailboxId, id, body.isRead);
    }
    if (body.isStarred !== undefined) {
      await emailService.markStarred(ctx, body.mailboxId, id, body.isStarred);
    }
    if (body.folder !== undefined) {
      await emailService.moveToFolder(ctx, body.mailboxId, id, body.folder);
    }
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("DELETE /api/emails/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const mailboxId = req.nextUrl.searchParams.get("mailboxId");
    if (!mailboxId) {
      throw new ValidationError("mailboxId is required");
    }
    
    await emailService.deleteEmail(ctx, mailboxId, id);
    
    logRequest(log, ctx, 204, start);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
