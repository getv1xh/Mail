/**
 * VMailx — Mailboxes API Routes
 * GET  /api/mailboxes  → list workspace mailboxes
 * POST /api/mailboxes  → create a new mailbox
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { mailboxService } from "@/lib/container";

const CreateMailboxSchema = z.object({
  domainId: z.string().uuid(),
  localPart: z.string().min(1).max(64).toLowerCase().trim(),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  storageQuotaMb: z.number().int().min(100).max(50000).optional(),
});

export async function GET(req: NextRequest) {
  const log = routeLogger("GET /api/mailboxes");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const domainId = req.nextUrl.searchParams.get("domainId");
    
    const mailboxes = await mailboxService.listMailboxes(ctx, {
      ...(domainId && { domainId }),
    });
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(mailboxes);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/mailboxes");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = CreateMailboxSchema.parse(await req.json());
    
    const mailbox = await mailboxService.createMailbox(ctx, body);
    
    logRequest(log, ctx, 201, start);
    return NextResponse.json(mailbox, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
