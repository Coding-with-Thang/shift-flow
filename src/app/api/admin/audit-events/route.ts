import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const takeRaw = Number(url.searchParams.get("take") ?? "80");
  const take = Number.isFinite(takeRaw) ? Math.min(200, Math.max(1, takeRaw)) : 80;

  const tenantFilter =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  const rows = await prisma.auditEvent.findMany({
    where: tenantFilter,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      tenant: { select: { tenantCode: true, name: true } },
      actor: { select: { username: true, publicAlias: true, role: true } },
    },
  });

  return NextResponse.json({
    events: rows.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      tenantCode: e.tenant.tenantCode,
      tenantName: e.tenant.name,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actorUsername: e.actor.username,
      actorAlias: e.actor.publicAlias,
      actorRole: e.actor.role,
      payload: e.payload,
    })),
  });
}
