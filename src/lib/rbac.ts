import type { Role } from "@prisma/client";

export function isSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function canApprove(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}

export function canManageUsers(role: Role) {
  return role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}

export function isAgent(role: Role) {
  return role === "AGENT";
}

export function canViewAnalytics(role: Role) {
  return role === "LEADER" || role === "OPS_MANAGER" || role === "SUPER_ADMIN";
}
