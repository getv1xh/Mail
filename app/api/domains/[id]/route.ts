/**
 * VMailx — Domain Detail + Delete Routes
 * GET    /api/domains/[id]  → domain detail
 * DELETE /api/domains/[id]  → delete domain
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { domainService } from "@/lib/container";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("GET /api/domains/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const domain = await domainService.getDomain(ctx, id);
    logRequest(log, ctx, 200, start);
    return NextResponse.json(domain);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("DELETE /api/domains/[id]");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    await domainService.deleteDomain(ctx, id);
    logRequest(log, ctx, 204, start);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
