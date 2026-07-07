/**
 * VMailx — Domain Verify Route
 * POST /api/domains/[id]/verify  → verify DNS records and register with Stalwart
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { domainService } from "@/lib/container";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("POST /api/domains/[id]/verify");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const result = await domainService.verifyDomain(ctx, id);
    logRequest(log, ctx, 200, start);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
