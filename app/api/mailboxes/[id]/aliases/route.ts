/**
 * VMailx — Mailbox Aliases Routes
 * GET  /api/mailboxes/[id]/aliases  → list mailbox aliases
 * POST /api/mailboxes/[id]/aliases  → add an alias
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { mailboxService } from "@/lib/container";

const AddAliasSchema = z.object({
  alias: z.string().email().toLowerCase().trim(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("GET /api/mailboxes/[id]/aliases");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    
    const aliases = await mailboxService.listAliases(ctx, id);
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(aliases);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = routeLogger("POST /api/mailboxes/[id]/aliases");
  const start = Date.now();
  try {
    const { id } = await params;
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = AddAliasSchema.parse(await req.json());
    
    const alias = await mailboxService.addAlias(ctx, id, body.alias);
    
    logRequest(log, ctx, 201, start);
    return NextResponse.json(alias, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
