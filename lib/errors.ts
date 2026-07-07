/**
 * VMailx — Centralized Error Classes
 *
 * All application errors extend AppError.
 * Route handlers catch these and return consistent JSON via handleError().
 * Unhandled errors become 500 Internal Server Error.
 */

import { type NextResponse, NextResponse as NR } from "next/server";

// ─── Base Error ──────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Specific Error Types ────────────────────────────────────────────────────

/** 400 — malformed input or failed schema validation */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/** 401 — no valid session */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** 403 — authenticated but insufficient role/permission */
export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

/** 404 — resource does not exist or is not visible to this workspace */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

/** 409 — uniqueness constraint violation (domain already registered, etc.) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/** 422 — domain verification failed, DNS not propagated, etc. */
export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "UNPROCESSABLE", details);
  }
}

/** 502 — Stalwart or other external service returned an error */
export class ExternalServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", details);
  }
}

// ─── Error Response Shape ────────────────────────────────────────────────────

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Error Handler ───────────────────────────────────────────────────────────

/**
 * Converts any thrown value into a consistent JSON NextResponse.
 * Import and call this in every API route handler's catch block.
 *
 * @example
 * } catch (err) {
 *   return handleError(err)
 * }
 */
export function handleError(err: unknown): NextResponse<ErrorResponseBody> {
  if (err instanceof AppError) {
    return NR.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined && { details: err.details }),
        },
      },
      { status: err.statusCode }
    );
  }

  // ZodError — surfaced from schema.parse() calls in route handlers
  if (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "ZodError"
  ) {
    return NR.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: (err as unknown as { errors: unknown }).errors,
        },
      },
      { status: 400 }
    );
  }

  // Unknown / unhandled
  console.error("[VMailx] Unhandled error:", err);
  return NR.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  );
}
