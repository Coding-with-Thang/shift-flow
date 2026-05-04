import { NextResponse } from "next/server";
import type { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import { getWindowRange, parseWindow } from "@/lib/analytics/window";

const VALID_DIMS = ["site", "skill", "hour", "dow", "hour-dow"] as const;
type Dim = (typeof VALID_DIMS)[number];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const hh = h.toString().padStart(2, "0");
  return `${hh}:00`;
});

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BreakdownBucket = {
  key: string;
  label: string;
  created: number;
  approved: number;
  declined: number;
  expired: number;
  cancelled: number;
  pending: number;
  claimed: number;
  fillRate: number | null;
  hour?: number;
  dow?: number;
};

function emptyBucket(
  key: string,
  label: string,
  extras?: { hour?: number; dow?: number },
): BreakdownBucket {
  return {
    key,
    label,
    created: 0,
    approved: 0,
    declined: 0,
    expired: 0,
    cancelled: 0,
    pending: 0,
    claimed: 0,
    fillRate: null,
    ...(extras ?? {}),
  };
}

function applyStatus(bucket: BreakdownBucket, status: TicketStatus, n: number) {
  bucket.created += n;
  switch (status) {
    case "APPROVED":
      bucket.approved += n;
      break;
    case "DECLINED":
      bucket.declined += n;
      break;
    case "EXPIRED":
      bucket.expired += n;
      break;
    case "CANCELLED":
      bucket.cancelled += n;
      break;
    case "PENDING":
      bucket.pending += n;
      break;
    case "CLAIMED":
      bucket.claimed += n;
      break;
  }
}

function finalize(buckets: Map<string, BreakdownBucket>): BreakdownBucket[] {
  return Array.from(buckets.values()).map((b) => ({
    ...b,
    fillRate: b.created > 0 ? b.approved / b.created : null,
  }));
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

  const dimRaw = url.searchParams.get("dim");
  const dim: Dim = (VALID_DIMS as readonly string[]).includes(dimRaw ?? "")
    ? (dimRaw as Dim)
    : "site";

  const window = parseWindow(url.searchParams.get("window"));
  const { start: windowStart, end: windowEnd } = getWindowRange(window);

  if (dim === "site" || dim === "skill") {
    const groupField = dim === "site" ? "siteTeam" : "skillTag";
    const grouped = await prisma.shiftTicket.groupBy({
      by: [groupField, "status"],
      where: { ...tenantFilter, createdAt: { gte: windowStart, lt: windowEnd } },
      _count: { _all: true },
    });
    const buckets = new Map<string, BreakdownBucket>();
    for (const row of grouped) {
      const raw = (row as Record<string, unknown>)[groupField] as string | null;
      const key = raw ?? "__unassigned__";
      const label = raw && raw.trim() !== "" ? raw : "Unassigned";
      const cur = buckets.get(key) ?? emptyBucket(key, label);
      applyStatus(cur, row.status, row._count._all);
      buckets.set(key, cur);
    }
    const out = finalize(buckets).sort((a, b) => b.created - a.created);
    return NextResponse.json({ dim, window, buckets: out });
  }

  const tickets = await prisma.shiftTicket.findMany({
    where: { ...tenantFilter, createdAt: { gte: windowStart, lt: windowEnd } },
    select: { status: true, startSlot: true, shiftDate: true },
  });

  if (dim === "hour") {
    const buckets = new Map<string, BreakdownBucket>();
    for (let h = 0; h < 24; h++) {
      const key = String(h);
      buckets.set(key, emptyBucket(key, HOUR_LABELS[h]));
    }
    for (const t of tickets) {
      const h = Math.max(0, Math.min(23, Math.floor(t.startSlot / 4)));
      const cur = buckets.get(String(h))!;
      applyStatus(cur, t.status, 1);
    }
    const out = finalize(buckets);
    return NextResponse.json({ dim, window, buckets: out });
  }

  if (dim === "dow") {
    const buckets = new Map<string, BreakdownBucket>();
    for (let d = 0; d < 7; d++) {
      buckets.set(String(d), emptyBucket(String(d), DOW_LABELS[d], { dow: d }));
    }
    for (const t of tickets) {
      const dow = t.shiftDate.getUTCDay();
      const cur = buckets.get(String(dow))!;
      applyStatus(cur, t.status, 1);
    }
    const out = finalize(buckets);
    return NextResponse.json({ dim, window, buckets: out });
  }

  const buckets = new Map<string, BreakdownBucket>();
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const key = `${d}-${h}`;
      buckets.set(key, emptyBucket(key, `${DOW_LABELS[d]} ${HOUR_LABELS[h]}`, { hour: h, dow: d }));
    }
  }
  for (const t of tickets) {
    const dow = t.shiftDate.getUTCDay();
    const hour = Math.max(0, Math.min(23, Math.floor(t.startSlot / 4)));
    const cur = buckets.get(`${dow}-${hour}`)!;
    applyStatus(cur, t.status, 1);
  }
  const out = finalize(buckets);
  return NextResponse.json({ dim, window, buckets: out });
}
