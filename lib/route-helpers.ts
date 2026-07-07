/**
 * VMailx — Route Handler Helpers
 *
 * Shared utilities for API route handlers.
 * Keeps route handlers thin: validate → auth → call service → respond.
 */

import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { type RequestContext } from "@/lib/logger";
import { UnauthorizedError } from "@/lib/errors";

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Validates the Better Auth session from the incoming request.
 * Throws UnauthorizedError if no valid session exists.
 */
export async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

// ─── Context Builder ──────────────────────────────────────────────────────────

/**
 * Builds a RequestContext from the request and session.
 * workspaceId is read from:
 *   1. X-Workspace-ID header (set by client on all authenticated requests)
 *   2. Falls back to empty string (service layer will reject if required)
 */
export function buildRequestContext(
  req: NextRequest,
  session: { user: { id: string } },
  overrides?: Partial<RequestContext>
): RequestContext {
  return {
    requestId:
      req.headers.get("x-request-id") ?? crypto.randomUUID(),
    workspaceId: req.headers.get("x-workspace-id") ?? "",
    userId: session.user.id,
    ...overrides,
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit: number;
  position: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  return {
    limit: Math.min(Number(searchParams.get("limit") ?? 50), 100),
    position: Number(searchParams.get("position") ?? 0),
  };
}
