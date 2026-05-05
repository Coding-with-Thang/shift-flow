import type { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DirectoryUser = {
  id: string;
  directoryId: string;
  username: string;
  publicAlias: string;
  role: Role;
  status: UserStatus;
};

export function userDirectoryId(userId: string): string {
  const tail = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  return tail.length >= 4 ? `USR-${tail}` : `USR-${userId.slice(0, 4).toUpperCase()}`;
}

export async function listUsersForTenant(tenantId: string): Promise<DirectoryUser[]> {
  const rows = await prisma.user.findMany({
    where: {
      tenantId,
      username: { not: "_system" },
    },
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      publicAlias: true,
      role: true,
      status: true,
    },
  });

  return rows.map((u) => ({
    id: u.id,
    directoryId: userDirectoryId(u.id),
    username: u.username,
    publicAlias: u.publicAlias,
    role: u.role,
    status: u.status,
  }));
}
