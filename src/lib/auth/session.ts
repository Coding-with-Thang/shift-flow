import type { Role, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/server";

export type SessionPayload = {
  sub: string;
  tenantId: string;
  role: Role;
};

/** Connection / startup failures — safe to degrade without auth instead of crashing RSC. */
function isPrismaUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P1001" || error.code === "P1017")
  ) {
    return true;
  }
  if (typeof error !== "object" || error === null) return false;
  const e = error as { name?: string; message?: string };
  if (e.name === "PrismaClientInitializationError") return true;
  if (typeof e.message === "string" && e.message.includes("Can't reach database server")) {
    return true;
  }
  return false;
}

/**
 * When true, requests without a Supabase user still get a real `User` row from the DB
 * (default: active super admin on tenant `demo`) so APIs and server components work.
 *
 * Enabled in development, or in production if `SCHEDULER_ALLOW_OPEN_SUPER_ADMIN=true`
 * (trusted hosts only).
 *
 * Override persona with `DEV_AUTH_TENANT_CODE` (default `demo`) and `DEV_AUTH_USERNAME`.
 */
export function isAnonymousSessionBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.SCHEDULER_ALLOW_OPEN_SUPER_ADMIN === "true"
  );
}

async function resolveDevBypassUser(): Promise<User | null> {
  try {
    const tenantCode = process.env.DEV_AUTH_TENANT_CODE?.trim() || "demo";
    const usernameOverride = process.env.DEV_AUTH_USERNAME?.trim();

    const tenant =
      (await prisma.tenant.findUnique({
        where: { tenantCode },
      })) ?? (await prisma.tenant.findFirst());

    if (!tenant) return null;

    if (usernameOverride) {
      const user = await prisma.user.findUnique({
        where: {
          tenantId_username: { tenantId: tenant.id, username: usernameOverride },
        },
      });
      if (!user || user.status !== "ACTIVE") return null;
      return user;
    }

    const superAdmin = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        status: "ACTIVE",
        role: "SUPER_ADMIN",
        username: { not: "_system" },
      },
    });
    if (superAdmin) return superAdmin;

    return prisma.user.findFirst({
      where: { tenantId: tenant.id, status: "ACTIVE" },
    });
  } catch (error) {
    if (!isPrismaUnavailableError(error)) throw error;
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user?.id) {
    try {
      const row = await prisma.user.findUnique({
        where: { authUserId: user.id },
      });
      if (row && row.status === "ACTIVE") {
        return {
          sub: row.id,
          tenantId: row.tenantId,
          role: row.role,
        };
      }
    } catch (err) {
      if (!isPrismaUnavailableError(err)) throw err;
    }
  }

  if (isAnonymousSessionBypassEnabled()) {
    const row = await resolveDevBypassUser();
    if (row) {
      return {
        sub: row.id,
        tenantId: row.tenantId,
        role: row.role,
      };
    }
  }

  return null;
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}
