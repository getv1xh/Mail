/**
 * VMailx — WorkspaceService
 *
 * Handles workspace creation, member management, and workspace resolution.
 * Every other service validates workspace membership through this service's helpers.
 */

import type { PrismaClient, Workspace, WorkspaceMember } from "@prisma/client";
import { type Logger } from "@/lib/logger";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { slugify } from "@/lib/utils";
import {
  type WorkspaceRole,
  type WorkspaceAction,
  canPerformWorkspaceAction,
} from "@/lib/rbac";
import type { RequestContext } from "@/lib/logger";

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
}

export class WorkspaceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly logger: Logger
  ) {}

  // ─── Create Workspace ─────────────────────────────────────────────────────

  async createWorkspace(
    userId: string,
    input: CreateWorkspaceInput
  ): Promise<Workspace> {
    const slug = input.slug ?? slugify(input.name);

    if (!slug || slug.length < 2) {
      throw new ValidationError("Workspace name must generate a valid slug");
    }

    const existing = await this.db.workspace.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError(`Workspace slug "${slug}" is already taken`);
    }

    const workspace = await this.db.workspace.create({
      data: {
        name: input.name,
        slug,
      },
    });

    // Audit log
    await this.db.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId,
        action: "workspace:created",
        resource: "workspace",
        resourceId: workspace.id,
      },
    });

    this.logger.info({ userId, workspaceId: workspace.id }, "Workspace created");
    return workspace;
  }

  // ─── Get Workspace (with auth check) ──────────────────────────────────────

  async getWorkspace(ctx: RequestContext): Promise<Workspace> {
    const workspace = await this.db.workspace.findUnique({
      where: { id: ctx.workspaceId },
    });
    if (!workspace) throw new NotFoundError("Workspace not found");

    // Verify user is a member
    await this.assertMember(ctx);
    return workspace;
  }

  async listUserWorkspaces(userId: string): Promise<Workspace[]> {
    const memberships = await this.db.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => m.workspace);
  }

  // ─── RBAC Helpers (used by all other services) ────────────────────────────

  /**
   * Assert user is a member of the workspace. Returns the member record.
   * Throws ForbiddenError if not a member.
   */
  async assertMember(ctx: RequestContext): Promise<WorkspaceMember> {
    const member = await this.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
        },
      },
    });
    if (!member) {
      throw new ForbiddenError("You are not a member of this workspace");
    }
    return member;
  }

  /**
   * Assert user can perform a specific workspace action.
   * Validates membership AND role permission in one call.
   */
  async assertPermission(
    ctx: RequestContext,
    action: WorkspaceAction
  ): Promise<WorkspaceMember> {
    const member = await this.assertMember(ctx);
    if (!canPerformWorkspaceAction(member.role as WorkspaceRole, action)) {
      throw new ForbiddenError(
        `Your role (${member.role}) does not allow: ${action}`
      );
    }
    return member;
  }

  // ─── Update Workspace ─────────────────────────────────────────────────────

  async updateWorkspace(
    ctx: RequestContext,
    input: Partial<{ name: string }>
  ): Promise<Workspace> {
    await this.assertPermission(ctx, "workspace:update");

    return this.db.workspace.update({
      where: { id: ctx.workspaceId },
      data: input,
    });
  }

  // ─── Delete Workspace ─────────────────────────────────────────────────────

  async deleteWorkspace(ctx: RequestContext): Promise<void> {
    await this.assertPermission(ctx, "workspace:delete");

    await this.db.workspace.delete({ where: { id: ctx.workspaceId } });
    this.logger.info(ctx, "Workspace deleted");
  }
}
