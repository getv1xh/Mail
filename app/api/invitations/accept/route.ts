import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError, ValidationError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { invitationService } from "@/lib/container";

const AcceptInviteSchema = z.object({
  token: z.string(),
});

export async function POST(req: NextRequest) {
  const log = routeLogger("POST /api/invitations/accept");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const body = AcceptInviteSchema.parse(await req.json());
    
    await invitationService.acceptInvitation(body.token, session.user.id);
    
    logRequest(log, buildRequestContext(req, session), 200, start);
    return NextResponse.json({ message: "Invitation accepted successfully" });
  } catch (err) {
    return handleError(err);
  }
}
