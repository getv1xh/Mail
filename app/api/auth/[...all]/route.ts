/**
 * VMailx — Better Auth catch-all route handler
 * Handles all /api/auth/* endpoints automatically.
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
