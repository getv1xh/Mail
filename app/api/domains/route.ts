/**
 * VMailx — Domains API Routes
 * GET  /api/domains  → list workspace domains
 * POST /api/domains  → add a new domain
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { domainService } from "@/lib/container";

const AddDomainSchema = z.object({
  domain: z.string().min(3).max(253).toLowerCase().trim(),
});

export async function GET(req: NextRequest) {
  const log = routeLogger("GET /api/domains");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const domains = await domainService.listDomains(ctx);
    logRequest(log, ctx, 200, start);
    return NextResponse.json(domains);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/domains");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = AddDomainSchema.parse(await req.json());
    const domain = await domainService.addDomain(ctx, body);
    logRequest(log, ctx, 201, start);
    return NextResponse.json(domain, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
