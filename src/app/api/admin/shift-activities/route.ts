import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import { ADMIN_SHIFT_ACTIVITY_ACTIONS, buildTicketAuditSummary } from "@/lib/tickets/activity-feed";
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

  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const takeRaw = Number(url.searchParams.get("take") ?? "50");
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const take = Number.isFinite(takeRaw) ? Math.min(100, Math.max(10, Math.floor(takeRaw))) : 50;
  const skip = (page - 1) * take;

  const rows = await prisma.auditEvent.findMany({
    where: {
      ...tenantWhere,
      action: { in: ADMIN_SHIFT_ACTIVITY_ACTIONS },
      shiftTicketId: { not: null },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take: take + 1,
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

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;

  const items = slice
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

  return NextResponse.json({ items, page, take, hasMore });
}
