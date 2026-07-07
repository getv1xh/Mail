/**
 * VMailx — Emails Search Route
 * GET  /api/emails/search  → search emails
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, buildRequestContext, parsePagination } from "@/lib/route-helpers";
import { handleError, ValidationError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { emailService } from "@/lib/container";

export async function GET(req: NextRequest) {
  const log = routeLogger("GET /api/emails/search");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const searchParams = req.nextUrl.searchParams;
    const mailboxId = searchParams.get("mailboxId");
    const query = searchParams.get("q");
    
    if (!mailboxId) throw new ValidationError("mailboxId is required");
    if (!query) throw new ValidationError("q (query) is required");
    
    const folder = searchParams.get("folder") as any;
    const from = searchParams.get("from") ?? undefined;
    const subject = searchParams.get("subject") ?? undefined;
    const after = searchParams.get("after") ? new Date(searchParams.get("after")!) : undefined;
    const before = searchParams.get("before") ? new Date(searchParams.get("before")!) : undefined;
    const { limit } = parsePagination(searchParams);
    
    const emails = await emailService.searchEmails(ctx, {
      mailboxId,
      query,
      folder,
      from,
      subject,
      after,
      before,
      limit,
    });
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(emails);
  } catch (err) {
    return handleError(err);
  }
}
