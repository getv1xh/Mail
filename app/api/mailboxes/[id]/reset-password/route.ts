/**
 * VMailx — Mailbox Reset Password Route
 * POST /api/mailboxes/[id]/reset-password  → reset mailbox password
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { mailboxService } from "@/lib/container";

const ResetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("POST /api/mailboxes/[id]/reset-password");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = ResetPasswordSchema.parse(await req.json());
    
    await mailboxService.resetMailboxPassword(ctx, id, body.password);
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
