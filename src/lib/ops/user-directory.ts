import type { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Tenant directory row: `username` is login User ID; `publicAlias` overrides peer display when set. */
export type DirectoryUser = {
  id: string;
  username: string;
  publicAlias: string | null;
  role: Role;
  status: UserStatus;
};

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
    username: u.username,
    publicAlias: u.publicAlias,
    role: u.role,
    status: u.status,
  }));
}
