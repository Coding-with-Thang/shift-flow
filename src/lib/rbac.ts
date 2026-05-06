import type { Role } from "@prisma/client";

export function isSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function canApprove(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}

/** Leaders, ops managers, and super admins may approve or decline a claimed shift swap (APPROVED / DECLINED). */
export function canApproveShiftTicket(role: Role) {
  return canApprove(role);
}

/** Ops managers and super admins (tenant-wide administration). */
export function canManageUsers(role: Role) {
  return role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}

/** Leaders, ops managers, and super admins may create users within allowed role limits (see `canAssignRole`). */
export function canProvisionUsers(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}

/** Whether `creator` may create a user with `target` role. */
export function canAssignRole(creator: Role, target: Role) {
  if (creator === "SUPER_ADMIN") return true;
  if (creator === "OPS_MANAGER") {
    return (
      target === "AGENT" || target === "LEADER" || target === "OPS_MANAGER"
    );
  }
  if (creator === "LEADER") {
    return target === "AGENT" || target === "LEADER";
  }
  return false;
}

export function isAgent(role: Role) {
  return role === "AGENT";
}

/** Who may claim an open marketplace ticket (same as posting: agents only). */
export function canClaimShift(role: Role) {
  return isAgent(role);
}

export function canViewAnalytics(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}

/**
 * Tenant admin (super admin): may issue a temp password reset for agents only.
 * Operations: may reset agents and leaders. Others cannot reset via this flow.
 */
export function canResetUserPassword(actor: Role, target: Role): boolean {
  if (actor === "SUPER_ADMIN") return target === "AGENT";
  if (actor === "OPS_MANAGER") return target === "AGENT" || target === "LEADER";
  return false;
}

/**
 * Who may delete a user.
 *
 * Notes:
 * - Leaders may delete agents and leaders.
 * - Ops managers may delete agents, leaders, and ops managers.
 * - Super admins may delete any role.
 */
export function canDeleteUser(actor: Role, target: Role): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "OPS_MANAGER") {
    return target === "AGENT" || target === "LEADER" || target === "OPS_MANAGER";
  }
  if (actor === "LEADER") {
    return target === "AGENT" || target === "LEADER";
  }
  return false;
}

/** Leaders, ops managers, and super admins may edit agent public aliases. */
export function canEditAgentAlias(actor: Role, target: Role): boolean {
  if (target !== "AGENT") return false;
  return actor === "LEADER" || actor === "OPS_MANAGER" || actor === "SUPER_ADMIN";
}

/** Ops managers and super admins may edit leader public aliases. */
export function canEditLeaderAlias(actor: Role, target: Role): boolean {
  if (target !== "LEADER") return false;
  return actor === "OPS_MANAGER" || actor === "SUPER_ADMIN";
}

/** Leaders and ops managers may edit their own alias (and super admins too). */
export function canEditOwnAlias(role: Role): boolean {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}
