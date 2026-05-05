import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listUsersForTenant } from "@/lib/ops/user-directory";
import { canProvisionUsers, isSuperAdmin } from "@/lib/rbac";
import UsersPageClient from "./UsersPageClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || !canProvisionUsers(session.role)) {
    redirect("/admin");
  }

  const meRow = await prisma.user.findFirst({
    where: isSuperAdmin(session.role)
      ? { id: session.sub }
      : { id: session.sub, tenantId: session.tenantId },
    select: {
      id: true,
      tenantId: true,
      username: true,
      role: true,
      publicAlias: true,
      tenant: { select: { name: true, tenantCode: true } },
    },
  });

  if (!meRow) {
    redirect("/admin");
  }

  const initialMe = {
    id: meRow.id,
    tenantId: meRow.tenantId,
    username: meRow.username,
    role: meRow.role,
    publicAlias: meRow.publicAlias,
    tenant: meRow.tenant,
  };

  const initialUsers = await listUsersForTenant(session.tenantId);

  return <UsersPageClient initialMe={initialMe} initialUsers={initialUsers} />;
}
