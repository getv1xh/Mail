/**
 * VMailx — AuthService
 *
 * Handles operations tied to the Better Auth User model.
 */

import type { PrismaClient, User } from "@prisma/client";
import { type Logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

export interface UpdateProfileInput {
  name?: string;
  avatar?: string;
}

export class AuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: Logger
  ) {}

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.db.user.update({
      where: { id: userId },
      data: input,
    });
    
    this.logger.info({ userId }, "User profile updated");
    return user;
  }
  
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // We use Better Auth's API to change the password
    // Wait, Better Auth is usually called from client side or standard endpoints for this.
    // If we want to do it programmatically on the server, we use auth.api.changePassword
    
    const req = new Request("http://localhost/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    
    // We need to pass the session headers to better auth to identify the user
    // In a real scenario we'd pass the actual request headers, but here we can't easily.
    // Actually, Better Auth handles its own password reset flows. 
    // This is just a stub for now. The client will call /api/auth/change-password directly.
    throw new Error("Please use /api/auth/change-password directly via Better Auth client");
  }
}
