/**
 * VMailx — Mailbox Detail, Update, and Delete Routes
 * GET    /api/mailboxes/[id]  → get mailbox details
 * PATCH  /api/mailboxes/[id]  → update mailbox
 * DELETE /api/mailboxes/[id]  → delete mailbox
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { mailboxService } from "@/lib/container";

const UpdateMailboxSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  storageQuotaMb: z.number().int().min(100).max(50000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("GET /api/mailboxes/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const mailbox = await mailboxService.getMailbox(ctx, id);
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(mailbox);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("PATCH /api/mailboxes/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = UpdateMailboxSchema.parse(await req.json());
    
    const updated = await mailboxService.updateMailbox(ctx, id, body);
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("DELETE /api/mailboxes/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    await mailboxService.deleteMailbox(ctx, id);
    
    logRequest(log, ctx, 204, start);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
