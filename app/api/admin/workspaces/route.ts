import { NextRequest, NextResponse } from "next/server";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError, ForbiddenError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const log = routeLogger("GET /api/admin/workspaces");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    // @ts-expect-error globalRole is dynamically added
    if (!isSuperAdmin(session.user.globalRole)) {
      throw new ForbiddenError("Only Super Admins can access this endpoint.");
    }
    
    const workspaces = await db.workspace.findMany({
      include: {
        members: {
          include: {
            user: true,
          }
        },
        _count: {
          select: {
            domains: true,
            mailboxes: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    
    logRequest(log, buildRequestContext(req, session), 200, start);
    return NextResponse.json(workspaces);
  } catch (err) {
    return handleError(err);
  }
}
