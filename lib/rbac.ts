/**
 * VMailx — RBAC (Role-Based Access Control)
 *
 * Two-layer permission model:
 *   1. Workspace roles   — what a user can do within a workspace
 *   2. Mailbox permissions — what a user can do with a specific mailbox
 *
 * DO NOT hardcode role checks in route handlers or services.
 * Always use canPerformWorkspaceAction() / canPerformMailboxAction().
 */

// ─── Global Roles ────────────────────────────────────────────────────────────

export const GlobalRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  USER: "USER",
} as const;

export type GlobalRole = (typeof GlobalRole)[keyof typeof GlobalRole];

// ─── Workspace Roles ─────────────────────────────────────────────────────────

export const WorkspaceRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

// ─── Mailbox Permissions ─────────────────────────────────────────────────────

export const MailboxPermission = {
  OWNER: "OWNER",
  SEND_AS: "SEND_AS",
  SEND_ON_BEHALF: "SEND_ON_BEHALF",
  READ_ONLY: "READ_ONLY",
} as const;

export type MailboxPermission =
  (typeof MailboxPermission)[keyof typeof MailboxPermission];

// ─── Workspace Permission Matrix ─────────────────────────────────────────────

/**
 * Maps each workspace action to the minimum roles allowed to perform it.
 * Order within each array does not matter — membership is checked with .includes().
 */
export const WORKSPACE_PERMISSIONS = {
  "domain:create": ["OWNER", "ADMIN"],
  "domain:delete": ["OWNER", "ADMIN"],
  "domain:verify": ["OWNER", "ADMIN"],
  "mailbox:create": ["OWNER", "ADMIN"],
  "mailbox:delete": ["OWNER", "ADMIN"],
  "mailbox:update": ["OWNER", "ADMIN"],
  "mailbox:resetPassword": ["OWNER", "ADMIN"],
  "alias:create": ["OWNER", "ADMIN"],
  "alias:delete": ["OWNER", "ADMIN"],
  "member:add": ["OWNER", "ADMIN"],
  "member:remove": ["OWNER"],
  "member:updateRole": ["OWNER"],
  "workspace:update": ["OWNER", "ADMIN"],
  "workspace:delete": ["OWNER"],
} as const;

export type WorkspaceAction = keyof typeof WORKSPACE_PERMISSIONS;

// ─── Mailbox Permission Matrix ────────────────────────────────────────────────

export const MAILBOX_PERMISSIONS = {
  "email:read": ["OWNER", "SEND_AS", "SEND_ON_BEHALF", "READ_ONLY"],
  "email:send": ["OWNER", "SEND_AS"],
  "email:sendOnBehalf": ["OWNER", "SEND_AS", "SEND_ON_BEHALF"],
  "email:delete": ["OWNER", "SEND_AS"],
  "email:manageFolders": ["OWNER"],
  "mailbox:admin": ["OWNER"],
} as const;

export type MailboxAction = keyof typeof MAILBOX_PERMISSIONS;

// ─── Permission Checks ───────────────────────────────────────────────────────

/**
 * Returns true if the given workspace role is allowed to perform the action.
 *
 * @example
 * if (!canPerformWorkspaceAction(member.role, "domain:create")) {
 *   throw new ForbiddenError(...)
 * }
 */
export function canPerformWorkspaceAction(
  role: WorkspaceRole,
  action: WorkspaceAction
): boolean {
  return (WORKSPACE_PERMISSIONS[action] as readonly string[]).includes(role);
}

/**
 * Returns true if the given mailbox permission level allows the action.
 *
 * @example
 * if (!canPerformMailboxAction(access.permission, "email:send")) {
 *   throw new ForbiddenError(...)
 * }
 */
export function canPerformMailboxAction(
  permission: MailboxPermission,
  action: MailboxAction
): boolean {
  return (MAILBOX_PERMISSIONS[action] as readonly string[]).includes(permission);
}

/**
 * Returns true if the user is a Super Admin.
 */
export function isSuperAdmin(globalRole: string): boolean {
  return globalRole === GlobalRole.SUPER_ADMIN;
}
