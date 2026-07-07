import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError, ForbiddenError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { workspaceService, invitationService } from "@/lib/container";
import { WorkspaceRole } from "@prisma/client";
import { canPerformWorkspaceAction } from "@/lib/rbac";

const InviteMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/workspaces/invite");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const body = InviteMemberSchema.parse(await req.json());
    
    // Verify user is a member of the workspace and has permission to add members
    const ctx = buildRequestContext(req, session, { workspaceId: body.workspaceId });
    const member = await workspaceService.assertMember(ctx);
    
    if (!canPerformWorkspaceAction(member.role as WorkspaceRole, "member:add")) {
      throw new ForbiddenError("You do not have permission to invite members.");
    }

    const invitation = await invitationService.createInvitation(
      body.workspaceId,
      session.user.id,
      {
        email: body.email,
        role: body.role as WorkspaceRole,
      }
    );
    
    logRequest(log, ctx, 201, start);
    return NextResponse.json({ message: "Invitation sent", invitationId: invitation.id }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
