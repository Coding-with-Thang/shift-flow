import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import {
  DECLINE_REASONS,
  DECLINE_REASON_KEYS,
  bucketDeclineReason,
  type DeclineReasonKey,
} from "@/lib/analytics/decline-reasons";
import { dayKeysInRange, getWindowRange, parseWindow, toDayKey } from "@/lib/analytics/window";

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

type SparklineMetric = "created" | "approved" | "declined" | "expired";

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
  const sevenDaysAgoStart = subDays(startOfDay(now), 6);

  const [pendingCount, claimedCount] = await Promise.all([
    prisma.shiftTicket.count({ where: { ...tenantFilter, status: "PENDING" } }),
    prisma.shiftTicket.count({ where: { ...tenantFilter, status: "CLAIMED" } }),
  ]);

  const [created, approved, declined, expired, cancelled, claimedEvents] =
    await Promise.all([
      prisma.shiftTicket.count({
        where: { ...tenantFilter, createdAt: { gte: windowStart, lt: windowEnd } },
      }),
      prisma.shiftTicket.count({
        where: {
          ...tenantFilter,
          status: "APPROVED",
          decidedAt: { gte: windowStart, lt: windowEnd },
        },
      }),
      prisma.shiftTicket.count({
        where: {
          ...tenantFilter,
          status: "DECLINED",
          decidedAt: { gte: windowStart, lt: windowEnd },
        },
      }),
      prisma.shiftTicket.count({
        where: {
          ...tenantFilter,
          status: "EXPIRED",
          updatedAt: { gte: windowStart, lt: windowEnd },
        },
      }),
      prisma.shiftTicket.count({
        where: {
          ...tenantFilter,
          status: "CANCELLED",
          updatedAt: { gte: windowStart, lt: windowEnd },
        },
      }),
      prisma.auditEvent.count({
        where: {
          ...tenantFilter,
          action: "TICKET_CLAIMED",
          createdAt: { gte: windowStart, lt: windowEnd },
        },
      }),
    ]);

  const decidedTickets = await prisma.shiftTicket.findMany({
    where: {
      ...tenantFilter,
      status: { in: ["APPROVED", "DECLINED"] },
      decidedAt: { gte: windowStart, lt: windowEnd },
    },
    select: { id: true, decidedAt: true },
  });

  let medianMs: number | null = null;
  let p90Ms: number | null = null;
  if (decidedTickets.length > 0) {
    const claims = await prisma.auditEvent.findMany({
      where: {
        ...tenantFilter,
        action: "TICKET_CLAIMED",
        shiftTicketId: { in: decidedTickets.map((t) => t.id) },
      },
      select: { shiftTicketId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const latestClaim = new Map<string, Date>();
    for (const c of claims) {
      if (c.shiftTicketId && !latestClaim.has(c.shiftTicketId)) {
        latestClaim.set(c.shiftTicketId, c.createdAt);
      }
    }
    const deltas: number[] = [];
    for (const t of decidedTickets) {
      const claim = latestClaim.get(t.id);
      if (claim && t.decidedAt) {
        const ms = t.decidedAt.getTime() - claim.getTime();
        if (ms >= 0) deltas.push(ms);
      }
    }
    medianMs = median(deltas);
    p90Ms = percentile(deltas, 90);
  }

  const activeRows = await prisma.auditEvent.findMany({
    where: {
      ...tenantFilter,
      action: "LOGIN_SUCCESS",
      createdAt: { gte: sevenDaysAgoStart },
    },
    select: { actorId: true },
    distinct: ["actorId"],
  });
  const activeUsers7d = activeRows.length;

  const declinedRows = await prisma.shiftTicket.findMany({
    where: {
      ...tenantFilter,
      status: "DECLINED",
      decidedAt: { gte: windowStart, lt: windowEnd },
    },
    select: { decisionNotes: true },
  });
  const reasonCounts: Record<DeclineReasonKey, number> = DECLINE_REASON_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as Record<DeclineReasonKey, number>,
  );
  for (const r of declinedRows) {
    reasonCounts[bucketDeclineReason(r.decisionNotes)] += 1;
  }
  const declineReasonsPayload = DECLINE_REASONS.map((r) => ({
    key: r.key,
    label: r.label,
    count: reasonCounts[r.key],
  }));

  const fillRate = created > 0 ? approved / created : null;
  const decisionsTotal = approved + declined;
  const declineRate = decisionsTotal > 0 ? declined / decisionsTotal : null;

  const todayStart = startOfDay(now);
  const rolledRows = await prisma.analyticsDaily.findMany({
    where: { ...tenantFilter, day: { gte: windowStart, lt: todayStart } },
    select: {
      day: true,
      ticketsCreated: true,
      approved: true,
      declined: true,
      expired: true,
    },
  });
  const rolled = new Map<string, Record<SparklineMetric, number>>();
  for (const r of rolledRows) {
    const k = toDayKey(r.day);
    const prev = rolled.get(k) ?? { created: 0, approved: 0, declined: 0, expired: 0 };
    rolled.set(k, {
      created: prev.created + r.ticketsCreated,
      approved: prev.approved + r.approved,
      declined: prev.declined + r.declined,
      expired: prev.expired + r.expired,
    });
  }

  const [todayCreatedLive, todayApprovedLive, todayDeclinedLive, todayExpiredLive] =
    await Promise.all([
      prisma.shiftTicket.count({
        where: { ...tenantFilter, createdAt: { gte: todayStart, lt: windowEnd } },
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
          action: "TICKET_EXPIRED",
          createdAt: { gte: todayStart, lt: windowEnd },
        },
      }),
    ]);
  const todayKey = toDayKey(now);
  rolled.set(todayKey, {
    created: todayCreatedLive,
    approved: todayApprovedLive,
    declined: todayDeclinedLive,
    expired: todayExpiredLive,
  });

  const dayKeys = dayKeysInRange(windowStart, windowEnd);
  const sparklineFor = (metric: SparklineMetric) =>
    dayKeys.map((day) => ({ day, value: rolled.get(day)?.[metric] ?? 0 }));

  return NextResponse.json({
    window,
    generatedAt: now.toISOString(),
    openNow: {
      pending: pendingCount,
      claimed: claimedCount,
      total: pendingCount + claimedCount,
    },
    windowMetrics: {
      created,
      approved,
      declined,
      expired,
      cancelled,
      claimedEvents,
      fillRate,
      declineRate,
      medianTimeToDecisionMs: medianMs,
      p90TimeToDecisionMs: p90Ms,
    },
    activeUsers7d,
    declineReasons: declineReasonsPayload,
    sparklines: {
      created: sparklineFor("created"),
      approved: sparklineFor("approved"),
      declined: sparklineFor("declined"),
      expired: sparklineFor("expired"),
    },
  });
}
