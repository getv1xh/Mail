/**
 * VMailx — Next.js Middleware
 *
 * Protects all (app) routes by validating the Better Auth session.
 * Workspace ID is resolved from a cookie or header and attached to the request.
 * Unauthenticated requests are redirected to /login.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/accept-invite",
  "/forgot-password",
  "/verify-email",
  "/api/auth",
  "/api/invitations",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Validate session via Better Auth
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Attach userId to headers so route handlers can read it without re-validating
  const response = NextResponse.next();
  response.headers.set("x-user-id", session.user.id);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
