/**
 * VMailx — Workspaces API Routes
 * GET  /api/workspaces  → list user workspaces
 * POST /api/workspaces  → create a new workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError, ForbiddenError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { workspaceService, invitationService } from "@/lib/container";
import { isSuperAdmin } from "@/lib/rbac";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).optional(),
  ownerEmail: z.string().email(),
});

export async function GET(req: NextRequest) {
  const log = routeLogger("GET /api/workspaces");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const workspaces = await workspaceService.listUserWorkspaces(session.user.id);
    
    logRequest(log, buildRequestContext(req, session), 200, start);
    return NextResponse.json(workspaces);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/workspaces");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    // @ts-expect-error globalRole is dynamically added
    if (!isSuperAdmin(session.user.globalRole)) {
      throw new ForbiddenError("Only Super Admins can create workspaces.");
    }

    const body = CreateWorkspaceSchema.parse(await req.json());
    
    const workspace = await workspaceService.createWorkspace(session.user.id, {
      name: body.name,
      slug: body.slug,
    });
    
    await invitationService.createInvitation(workspace.id, session.user.id, {
      email: body.ownerEmail,
      role: "OWNER",
    });
    
    logRequest(log, buildRequestContext(req, session), 201, start);
    return NextResponse.json(workspace, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
