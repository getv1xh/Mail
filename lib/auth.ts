/**
 * VMailx — Better Auth Configuration
 *
 * Configured for Next.js App Router with:
 * - Email/password authentication
 * - Email verification (required before login)
 * - Password reset via email
 * - Secure session management (httpOnly cookies)
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: integrate transactional email provider (Resend/Postmark) in Phase 2
      // For now, log the verification URL for local development
      console.log(`[VMailx] Email verification for ${user.email}: ${url}`);
    },
    sendOnSignUp: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute cache
    },
  },

  user: {
    additionalFields: {
      avatar: {
        type: "string",
        required: false,
        input: true,
      },
      globalRole: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "USER",
      }
    },
    changeEmail: {
      enabled: true,
    },
  },

  advanced: {
    cookiePrefix: "vmailx",
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
