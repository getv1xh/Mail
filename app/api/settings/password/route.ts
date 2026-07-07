/**
 * VMailx — Settings Password Route
 * PATCH /api/settings/password  → change user password
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { authService } from "@/lib/container";

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(req: NextRequest) {
  const log = routeLogger("PATCH /api/settings/password");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = ChangePasswordSchema.parse(await req.json());
    
    await authService.changePassword(ctx.userId, body.currentPassword, body.newPassword);
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
