import { NextRequest, NextResponse } from "next/server";
import { handleError, NotFoundError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { invitationService } from "@/lib/container";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const log = routeLogger("GET /api/invitations/[token]");
  const start = Date.now();
  try {
    const { token } = await params;
    if (!token) throw new NotFoundError("Token is required");

    const invitation = await invitationService.getInvitationByToken(token);
    
    logRequest(log, { userId: "guest", workspaceId: "none", role: "none", path: req.nextUrl.pathname }, 200, start);
    
    return NextResponse.json({
      email: invitation.email,
      workspaceName: invitation.workspace.name,
      role: invitation.role,
    });
  } catch (err) {
    return handleError(err);
  }
}
