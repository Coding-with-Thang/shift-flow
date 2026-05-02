import { prisma } from "./db";

const SYSTEM_USERNAME = "_system";

/** Idempotent: ensures a non-login system user exists for audit-only actions. */
export async function ensureSystemUser(tenantId: string) {
  const existing = await prisma.user.findFirst({
    where: { tenantId, username: SYSTEM_USERNAME },
  });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      tenantId,
      username: SYSTEM_USERNAME,
      passwordHash: null,
      authUserId: null,
      role: "SUPER_ADMIN",
      publicAlias: "System",
      status: "DISABLED",
    },
  });
}

export async function getSystemUserId(tenantId: string) {
  const u = await ensureSystemUser(tenantId);
  return u.id;
}
