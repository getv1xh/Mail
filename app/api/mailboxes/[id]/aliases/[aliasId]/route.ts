/**
 * VMailx — Mailbox Alias Delete Route
 * DELETE /api/mailboxes/[id]/aliases/[aliasId]  → delete an alias
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { mailboxService } from "@/lib/container";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; aliasId: string }> }
) {
  const log = routeLogger("DELETE /api/mailboxes/[id]/aliases/[aliasId]");
  const start = Date.now();
  try {
    const { id, aliasId } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    await mailboxService.removeAlias(ctx, id, aliasId);
    
    logRequest(log, ctx, 204, start);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
