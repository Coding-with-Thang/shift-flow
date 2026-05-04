import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import { dayKeysInRange, getWindowRange, parseWindow, toDayKey } from "@/lib/analytics/window";

type DailyVolume = {
  day: string;
  created: number;
  claimed: number;
  approved: number;
  declined: number;
  cancelled: number;
  expired: number;
};

type DailyLatency = {
  day: string;
  toClaim: { p50Ms: number | null; p90Ms: number | null; count: number };
  toDecision: { p50Ms: number | null; p90Ms: number | null; count: number };
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(nums: number[], p: number): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
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

  const window = parseWindow(url.searchParams.get("window"));
  const now = new Date();
  const { start: windowStart, end: windowEnd } = getWindowRange(window, now);
  const todayStart = startOfDay(now);

  const dayKeys = dayKeysInRange(windowStart, windowEnd);
  const volumeByDay = new Map<string, DailyVolume>();
  for (const day of dayKeys) {
    volumeByDay.set(day, {
      day,
      created: 0,
      claimed: 0,
      approved: 0,
      declined: 0,
      cancelled: 0,
      expired: 0,
    });
  }

  const rolledRows = await prisma.analyticsDaily.findMany({
    where: { ...tenantFilter, day: { gte: windowStart, lt: todayStart } },
    select: {
      day: true,
      ticketsCreated: true,
      claimsMade: true,
      approved: true,
      declined: true,
      cancelled: true,
      expired: true,
    },
  });
  for (const r of rolledRows) {
    const k = toDayKey(r.day);
    const cur = volumeByDay.get(k);
    if (!cur) continue;
    cur.created += r.ticketsCreated;
    cur.claimed += r.claimsMade;
    cur.approved += r.approved;
    cur.declined += r.declined;
    cur.cancelled += r.cancelled;
    cur.expired += r.expired;
  }

  const [
    todayCreated,
    todayClaimed,
    todayApproved,
    todayDeclined,
    todayCancelled,
    todayExpired,
  ] = await Promise.all([
    prisma.shiftTicket.count({
      where: { ...tenantFilter, createdAt: { gte: todayStart, lt: windowEnd } },
    }),
    prisma.auditEvent.count({
      where: {
        ...tenantFilter,
        action: "TICKET_CLAIMED",
        createdAt: { gte: todayStart, lt: windowEnd },
      },
    }),
    prisma.auditEvent.count({
      where: {
        ...tenantFilter,
        action: "TICKET_APPROVED",
        createdAt: { gte: todayStart, lt: windowEnd },
      },
    }),
    prisma.auditEvent.count({
      where: {
        ...tenantFilter,
        action: "TICKET_DECLINED",
        createdAt: { gte: todayStart, lt: windowEnd },
      },
    }),
    prisma.auditEvent.count({
      where: {
        ...tenantFilter,
        action: "TICKET_CANCELLED",
        createdAt: { gte: todayStart, lt: windowEnd },
      },
    }),
    prisma.auditEvent.count({
      where: {
        ...tenantFilter,
        action: "TICKET_EXPIRED",
        createdAt: { gte: todayStart, lt: windowEnd },
      },
    }),
  ]);

  const todayKey = toDayKey(now);
  const todayBucket = volumeByDay.get(todayKey);
  if (todayBucket) {
    todayBucket.created = todayCreated;
    todayBucket.claimed = todayClaimed;
    todayBucket.approved = todayApproved;
    todayBucket.declined = todayDeclined;
    todayBucket.cancelled = todayCancelled;
    todayBucket.expired = todayExpired;
  }

  const claimEvents = await prisma.auditEvent.findMany({
    where: {
      ...tenantFilter,
      action: "TICKET_CLAIMED",
      createdAt: { gte: windowStart, lt: windowEnd },
      shiftTicketId: { not: null },
    },
    select: {
      createdAt: true,
      shiftTicketId: true,
      shiftTicket: { select: { id: true, createdAt: true } },
    },
  });
  const toClaimMsByDay = new Map<string, number[]>();
  for (const ev of claimEvents) {
    if (!ev.shiftTicket) continue;
    const ms = ev.createdAt.getTime() - ev.shiftTicket.createdAt.getTime();
    if (ms < 0) continue;
    const k = toDayKey(ev.createdAt);
    const arr = toClaimMsByDay.get(k) ?? [];
    arr.push(ms);
    toClaimMsByDay.set(k, arr);
  }

  const decidedTickets = await prisma.shiftTicket.findMany({
    where: {
      ...tenantFilter,
      status: { in: ["APPROVED", "DECLINED"] },
      decidedAt: { gte: windowStart, lt: windowEnd },
    },
    select: { id: true, decidedAt: true },
  });
  const toDecisionMsByDay = new Map<string, number[]>();
  if (decidedTickets.length > 0) {
    const claimsForDecided = await prisma.auditEvent.findMany({
      where: {
        ...tenantFilter,
        action: "TICKET_CLAIMED",
        shiftTicketId: { in: decidedTickets.map((t) => t.id) },
      },
      select: { shiftTicketId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const latestClaim = new Map<string, Date>();
    for (const c of claimsForDecided) {
      if (c.shiftTicketId && !latestClaim.has(c.shiftTicketId)) {
        latestClaim.set(c.shiftTicketId, c.createdAt);
      }
    }
    for (const t of decidedTickets) {
      const claim = latestClaim.get(t.id);
      if (!claim || !t.decidedAt) continue;
      const ms = t.decidedAt.getTime() - claim.getTime();
      if (ms < 0) continue;
      const k = toDayKey(t.decidedAt);
      const arr = toDecisionMsByDay.get(k) ?? [];
      arr.push(ms);
      toDecisionMsByDay.set(k, arr);
    }
  }

  const latency: DailyLatency[] = dayKeys.map((day) => {
    const claim = toClaimMsByDay.get(day) ?? [];
    const dec = toDecisionMsByDay.get(day) ?? [];
    return {
      day,
      toClaim: {
        p50Ms: median(claim),
        p90Ms: percentile(claim, 90),
        count: claim.length,
      },
      toDecision: {
        p50Ms: median(dec),
        p90Ms: percentile(dec, 90),
        count: dec.length,
      },
    };
  });

  const volume: DailyVolume[] = dayKeys.map((day) => volumeByDay.get(day)!);

  return NextResponse.json({ window, volume, latency });
}
