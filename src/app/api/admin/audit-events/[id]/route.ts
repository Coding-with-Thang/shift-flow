import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Params) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAnalytics(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const tenantWhere =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  const row = await prisma.auditEvent.findFirst({
    where: { id: id.trim(), ...tenantWhere },
    select: {
      id: true,
      createdAt: true,
      action: true,
      entityType: true,
      entityId: true,
      payload: true,
      tenant: { select: { tenantCode: true, name: true } },
      actor: { select: { username: true, publicAlias: true, role: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      tenantCode: row.tenant.tenantCode,
      tenantName: row.tenant.name,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorUsername: row.actor.username,
      actorAlias: row.actor.publicAlias,
      actorRole: row.actor.role,
      payload: row.payload,
    },
  });
}
