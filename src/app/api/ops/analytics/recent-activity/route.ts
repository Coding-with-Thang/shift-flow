import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import {
  ADMIN_SHIFT_ACTIVITY_ACTIONS,
  buildTicketAuditSummary,
} from "@/lib/tickets/activity-feed";
import { peerAlias } from "@/lib/user-display";

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAnalytics(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;
  const tenantWhere =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  const takeRaw = Number(url.searchParams.get("take") ?? "10");
  const take = Number.isFinite(takeRaw)
    ? Math.min(50, Math.max(1, Math.floor(takeRaw)))
    : 10;

  const rows = await prisma.auditEvent.findMany({
    where: {
      ...tenantWhere,
      action: { in: ADMIN_SHIFT_ACTIVITY_ACTIONS },
      shiftTicketId: { not: null },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    include: {
      actor: { select: { publicAlias: true, username: true } },
      shiftTicket: {
        include: {
          requestor: { select: { publicAlias: true, username: true } },
          claimer: { select: { publicAlias: true, username: true } },
        },
      },
    },
  });

  const items = rows
    .filter((r): r is typeof r & { shiftTicket: NonNullable<(typeof r)["shiftTicket"]> } =>
      Boolean(r.shiftTicket),
    )
    .map((r) => ({
      id: r.id,
      ticketId: r.shiftTicket.id,
      action: r.action,
      createdAt: r.createdAt.toISOString(),
      actorAlias: peerAlias(r.actor),
      actorUsername: r.actor.username,
      summary: buildTicketAuditSummary(r.action, r.shiftTicket),
      ticketStatus: r.shiftTicket.status,
    }));

  return NextResponse.json({ items });
}
