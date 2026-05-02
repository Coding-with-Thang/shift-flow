import type { Role } from "@prisma/client";

export function isSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function canApprove(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
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
    return target === "AGENT" || target === "LEADER";
  }
  if (creator === "LEADER") {
    return target === "AGENT";
  }
  return false;
}

export function isAgent(role: Role) {
  return role === "AGENT";
}

export function canViewAnalytics(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}
