import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics, isSuperAdmin } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";

function mapAggRow(r: {
  day: Date;
  ticketsCreated: number;
  claimsMade: number;
  approved: number;
  declined: number;
  cancelled: number;
  expired: number;
}) {
  return {
    day: r.day.toISOString().slice(0, 10),
    ticketsCreated: r.ticketsCreated,
    claimsMade: r.claimsMade,
    approved: r.approved,
    declined: r.declined,
    cancelled: r.cancelled,
    expired: r.expired,
  };
}

function aggregateByDay(
  rows: {
    day: Date;
    ticketsCreated: number;
    claimsMade: number;
    approved: number;
    declined: number;
    cancelled: number;
    expired: number;
  }[],
) {
  const map = new Map<
    string,
    {
      day: string;
      ticketsCreated: number;
      claimsMade: number;
      approved: number;
      declined: number;
      cancelled: number;
      expired: number;
    }
  >();
  for (const r of rows) {
    const day = r.day.toISOString().slice(0, 10);
    const prev = map.get(day);
    if (!prev) {
      map.set(day, mapAggRow(r));
    } else {
      map.set(day, {
        day,
        ticketsCreated: prev.ticketsCreated + r.ticketsCreated,
        claimsMade: prev.claimsMade + r.claimsMade,
        approved: prev.approved + r.approved,
        declined: prev.declined + r.declined,
        cancelled: prev.cancelled + r.cancelled,
        expired: prev.expired + r.expired,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 60);
}

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAnalytics(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const tenantFilter =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  if (isSuperAdmin(session.role) && Object.keys(tenantFilter).length === 0) {
    const rows = await prisma.analyticsDaily.findMany({
      orderBy: { day: "desc" },
      take: 720,
    });
    return NextResponse.json({ rows: aggregateByDay(rows), scope: "all_tenants" as const });
  }

  const rows = await prisma.analyticsDaily.findMany({
    where: tenantFilter,
    orderBy: { day: "desc" },
    take: 60,
  });

  return NextResponse.json({ rows: rows.map(mapAggRow) });
}
