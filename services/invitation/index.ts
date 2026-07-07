import type { PrismaClient, Invitation, WorkspaceRole } from "@prisma/client";
import { type Logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { randomBytes } from "crypto";

export interface CreateInvitationInput {
  email: string;
  role: WorkspaceRole;
}

export class InvitationService {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: Logger
  ) {}

  /**
   * Create a new invitation for a workspace.
   */
  async createInvitation(
    workspaceId: string,
    creatorId: string,
    input: CreateInvitationInput
  ): Promise<Invitation> {
    const existingMember = await this.db.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email: input.email },
      },
    });

    if (existingMember) {
      throw new ConflictError("User is already a member of this workspace");
    }

    const existingInvite = await this.db.invitation.findUnique({
      where: {
        email_workspaceId: {
          email: input.email,
          workspaceId,
        },
      },
    });

    if (existingInvite && existingInvite.expiresAt > new Date()) {
      throw new ConflictError("A valid invitation already exists for this email");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    const invitation = await this.db.invitation.upsert({
      where: {
        email_workspaceId: {
          email: input.email,
          workspaceId,
        },
      },
      create: {
        workspaceId,
        email: input.email,
        role: input.role,
        token,
        createdBy: creatorId,
        expiresAt,
      },
      update: {
        role: input.role,
        token,
        createdBy: creatorId,
        expiresAt,
        acceptedAt: null,
      },
    });

    this.logger.info({ workspaceId, email: input.email }, "Invitation created");

    // TODO: Phase 2 - Trigger email sending via a background job or event
    console.log(`[VMailx] Invite link for ${input.email}: http://localhost:3000/accept-invite?token=${token}`);

    return invitation;
  }

  /**
   * Retrieve an invitation by its token.
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.db.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      throw new NotFoundError("Invitation not found or invalid");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError("Invitation has expired");
    }

    if (invitation.acceptedAt) {
      throw new ValidationError("Invitation has already been accepted");
    }

    return invitation;
  }

  /**
   * Accept an invitation and add the user to the workspace.
   */
  async acceptInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.getInvitationByToken(token);

    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invitation.email) {
      throw new ValidationError("User email does not match invitation email");
    }

    await this.db.$transaction(async (tx) => {
      // 1. Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // 2. Add user to workspace
      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId,
          },
        },
        create: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
        update: {
          role: invitation.role, // Upgrade/downgrade role if they were somehow already added
        },
      });

      // 3. Log the audit event
      await tx.auditLog.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          action: "member:joined",
          resource: "workspace",
          resourceId: invitation.workspaceId,
          details: { role: invitation.role },
        },
      });
    });

    this.logger.info({ workspaceId: invitation.workspaceId, userId }, "Invitation accepted");
  }
}
