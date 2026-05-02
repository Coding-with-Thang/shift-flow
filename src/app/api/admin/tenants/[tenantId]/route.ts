import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/rbac";

type Params = { params: Promise<{ tenantId: string }> };

export async function DELETE(_req: Request, ctx: Params) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = await ctx.params;
  if (!tenantId?.trim()) {
    return NextResponse.json({ error: "Invalid tenant" }, { status: 400 });
  }

  const result = await prisma.tenant.deleteMany({
    where: { id: tenantId.trim() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
