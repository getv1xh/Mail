/**
 * VMailx — Structured Logger (Pino)
 *
 * Every request log includes: requestId, workspaceId, userId, route, duration, statusCode.
 * In development: pretty-printed with colors.
 * In production: JSON lines (ingest into Datadog, Logtail, etc.).
 */

import pino from "pino";

// ─── Logger Instance ─────────────────────────────────────────────────────────

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "vmailx" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,service",
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;

// ─── Request Context ─────────────────────────────────────────────────────────

/**
 * Structured context attached to every service call and log line.
 * Generated once per request in the route handler, then threaded through.
 */
export interface RequestContext {
  /** UUID generated per HTTP request — correlates all log lines for one call */
  requestId: string;
  /** Active workspace scope for this request */
  workspaceId: string;
  /** Authenticated user making the request */
  userId: string;
}

/**
 * Builds a RequestContext from the incoming request and resolved session.
 * Respects X-Request-ID header so callers (e.g. a gateway) can inject their own ID.
 */
export function buildContext(
  req: Request,
  session: { userId: string },
  workspaceId: string
): RequestContext {
  return {
    requestId:
      req.headers.get("x-request-id") ?? crypto.randomUUID(),
    workspaceId,
    userId: session.userId,
  };
}

// ─── Request Logger Helper ───────────────────────────────────────────────────

/**
 * Creates a child logger pre-bound to a route name.
 * Call at the top of each route handler to avoid repeating the route string.
 *
 * @example
 * const log = routeLogger("POST /api/domains")
 * log.info(ctx, "Domain added")
 */
export function routeLogger(route: string) {
  return logger.child({ route });
}

/**
 * Logs a completed request with timing and status.
 * Call at the end of every successful and error branch.
 */
export function logRequest(
  log: Logger,
  ctx: Partial<RequestContext>,
  statusCode: number,
  startMs: number
) {
  const duration = Date.now() - startMs;
  log.info({ ...ctx, statusCode, duration }, "request completed");
}
