import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import { getWindowRange, parseWindow } from "@/lib/analytics/window";
import { peerAlias } from "@/lib/user-display";

const VALID_ROLES = ["requestor", "claimer", "approver"] as const;
type LeaderboardRole = (typeof VALID_ROLES)[number];

type LeaderboardEntry = {
  userId: string;
  alias: string;
  username: string;
  role: string;
  total: number;
  approved: number;
  declined: number;
};

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

  const window = parseWindow(url.searchParams.get("window"));
  const { start: windowStart, end: windowEnd } = getWindowRange(window);

  const roleParam = url.searchParams.get("role");
  const role: LeaderboardRole = (VALID_ROLES as readonly string[]).includes(roleParam ?? "")
    ? (roleParam as LeaderboardRole)
    : "requestor";

  const limitRaw = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
    : 10;

  const counts = new Map<string, { total: number; approved: number; declined: number }>();
  const bump = (
    userId: string,
    field: "total" | "approved" | "declined",
    n: number,
  ) => {
    const cur = counts.get(userId) ?? { total: 0, approved: 0, declined: 0 };
    cur[field] += n;
    counts.set(userId, cur);
  };

  if (role === "requestor") {
    const grouped = await prisma.shiftTicket.groupBy({
      by: ["requestorId", "status"],
      where: { ...tenantFilter, createdAt: { gte: windowStart, lt: windowEnd } },
      _count: { _all: true },
    });
    for (const r of grouped) {
      bump(r.requestorId, "total", r._count._all);
      if (r.status === "APPROVED") bump(r.requestorId, "approved", r._count._all);
      if (r.status === "DECLINED") bump(r.requestorId, "declined", r._count._all);
    }
  } else if (role === "claimer") {
    const grouped = await prisma.shiftTicket.groupBy({
      by: ["claimerId", "status"],
      where: {
        ...tenantFilter,
        claimerId: { not: null },
        updatedAt: { gte: windowStart, lt: windowEnd },
      },
      _count: { _all: true },
    });
    for (const r of grouped) {
      if (!r.claimerId) continue;
      bump(r.claimerId, "total", r._count._all);
      if (r.status === "APPROVED") bump(r.claimerId, "approved", r._count._all);
      if (r.status === "DECLINED") bump(r.claimerId, "declined", r._count._all);
    }
  } else {
    const grouped = await prisma.shiftTicket.groupBy({
      by: ["approverId", "status"],
      where: {
        ...tenantFilter,
        approverId: { not: null },
        decidedAt: { gte: windowStart, lt: windowEnd },
      },
      _count: { _all: true },
    });
    for (const r of grouped) {
      if (!r.approverId) continue;
      bump(r.approverId, "total", r._count._all);
      if (r.status === "APPROVED") bump(r.approverId, "approved", r._count._all);
      if (r.status === "DECLINED") bump(r.approverId, "declined", r._count._all);
    }
  }

  const ranked = Array.from(counts.entries())
    .map(([userId, c]) => ({ userId, ...c }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  if (ranked.length === 0) {
    return NextResponse.json({ window, role, entries: [] });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, publicAlias: true, username: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const entries: LeaderboardEntry[] = ranked.map((r) => {
    const u = userMap.get(r.userId);
    return {
      userId: r.userId,
      alias: u ? peerAlias(u) : "Unknown",
      username: u?.username ?? "unknown",
      role: u?.role ?? "AGENT",
      total: r.total,
      approved: r.approved,
      declined: r.declined,
    };
  });

  return NextResponse.json({ window, role, entries });
}
