import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/rbac";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: isSuperAdmin(s.role) ? { id: s.sub } : { id: s.sub, tenantId: s.tenantId },
    select: {
      id: true,
      tenantId: true,
      username: true,
      role: true,
      publicAlias: true,
      mustChangePassword: true,
      tenant: { select: { name: true, tenantCode: true } },
    },
  });
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user });
}
