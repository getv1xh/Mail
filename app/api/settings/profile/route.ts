/**
 * VMailx — Settings Profile Route
 * PATCH /api/settings/profile  → update user profile
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, buildRequestContext } from "@/lib/route-helpers";
import { handleError } from "@/lib/errors";
import { routeLogger, logRequest } from "@/lib/logger";
import { authService } from "@/lib/container";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  const log = routeLogger("PATCH /api/settings/profile");
  const start = Date.now();
  try {
    const session = await requireSession(req);
    const ctx = buildRequestContext(req, session);
    const body = UpdateProfileSchema.parse(await req.json());
    
    const user = await authService.updateProfile(ctx.userId, body);
    
    logRequest(log, ctx, 200, start);
    return NextResponse.json(user);
  } catch (err) {
    return handleError(err);
  }
}
