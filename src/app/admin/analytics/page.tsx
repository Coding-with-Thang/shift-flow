"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Hourglass,
  Inbox,
  Loader2,
  Timer,
  Users,
  XCircle,
  Clock,
} from "lucide-react";
import { canViewAnalytics } from "@/lib/rbac";
import {
  ANALYTICS_WINDOWS,
  type AnalyticsWindow,
} from "@/lib/analytics/window";
import { KpiTile } from "@/components/admin/analytics/KpiTile";
import { WindowSwitcher } from "@/components/admin/analytics/WindowSwitcher";
import {
  formatDuration,
  formatNumber,
  formatPercent,
} from "@/components/admin/analytics/formatters";
import { TrendStackedArea } from "@/components/admin/analytics/TrendStackedArea";
import { DeclineReasonDonut } from "@/components/admin/analytics/DeclineReasonDonut";
import { FillRateLine } from "@/components/admin/analytics/FillRateLine";
import { LatencyP50P90 } from "@/components/admin/analytics/LatencyP50P90";
import {
  BreakdownBars,
  type BreakdownBucket,
} from "@/components/admin/analytics/BreakdownBars";
import {
  Leaderboard,
  type LeaderboardEntry,
} from "@/components/admin/analytics/Leaderboard";
import {
  HourDowHeatmap,
  type HeatmapBucket,
} from "@/components/admin/analytics/HourDowHeatmap";
import type { DeclineReasonKey } from "@/lib/analytics/decline-reasons";
import type { Role } from "@prisma/client";

type SummaryResponse = {
  window: number;
  generatedAt: string;
  openNow: { pending: number; claimed: number; total: number };
  windowMetrics: {
    created: number;
    approved: number;
    declined: number;
    expired: number;
    cancelled: number;
    claimedEvents: number;
    fillRate: number | null;
    declineRate: number | null;
    medianTimeToDecisionMs: number | null;
    p90TimeToDecisionMs: number | null;
  };
  activeUsers7d: number;
  declineReasons: { key: DeclineReasonKey; label: string; count: number }[];
  sparklines: {
    created: { day: string; value: number }[];
    approved: { day: string; value: number }[];
    declined: { day: string; value: number }[];
    expired: { day: string; value: number }[];
  };
};

type TrendResponse = {
  window: number;
  volume: {
    day: string;
    created: number;
    claimed: number;
    approved: number;
    declined: number;
    cancelled: number;
    expired: number;
  }[];
  latency: {
    day: string;
    toClaim: { p50Ms: number | null; p90Ms: number | null; count: number };
    toDecision: { p50Ms: number | null; p90Ms: number | null; count: number };
  }[];
};

type Dim = "site" | "skill" | "hour" | "dow";

export default function AnalyticsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [windowDays, setWindowDays] = useState<AnalyticsWindow>(30);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);

  const [dim, setDim] = useState<Dim>("site");
  const [breakdown, setBreakdown] = useState<BreakdownBucket[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const [heatmap, setHeatmap] = useState<HeatmapBucket[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const [requestors, setRequestors] = useState<LeaderboardEntry[]>([]);
  const [claimers, setClaimers] = useState<LeaderboardEntry[]>([]);
  const [approvers, setApprovers] = useState<LeaderboardEntry[]>([]);

  const [coreLoading, setCoreLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const meRes = await fetch("/api/me", { credentials: "include" }).catch(() => null);
      if (!meRes || !meRes.ok) {
        if (!cancelled) {
          setSessionReady(true);
        }
        return;
      }
      const meData = (await meRes.json().catch(() => ({}))) as {
        user?: { role: Role } | null;
      };
      if (!cancelled) {
        setRole(meData.user?.role ?? null);
        setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchCore = useCallback(
    async (w: AnalyticsWindow) => {
      setCoreLoading(true);
      setError(null);
      try {
        const [s, t, r1, r2, r3] = await Promise.all([
          fetch(`/api/ops/analytics/summary?window=${w}`, { credentials: "include" }),
          fetch(`/api/ops/analytics/trend?window=${w}`, { credentials: "include" }),
          fetch(`/api/ops/analytics/leaderboard?role=requestor&window=${w}`, {
            credentials: "include",
          }),
          fetch(`/api/ops/analytics/leaderboard?role=claimer&window=${w}`, {
            credentials: "include",
          }),
          fetch(`/api/ops/analytics/leaderboard?role=approver&window=${w}`, {
            credentials: "include",
          }),
        ]);
        if (!s.ok) throw new Error(`summary ${s.status}`);
        if (!t.ok) throw new Error(`trend ${t.status}`);
        const sData = (await s.json()) as SummaryResponse;
        const tData = (await t.json()) as TrendResponse;
        const r1Data = r1.ok
          ? ((await r1.json()) as { entries: LeaderboardEntry[] })
          : { entries: [] };
        const r2Data = r2.ok
          ? ((await r2.json()) as { entries: LeaderboardEntry[] })
          : { entries: [] };
        const r3Data = r3.ok
          ? ((await r3.json()) as { entries: LeaderboardEntry[] })
          : { entries: [] };

        setSummary(sData);
        setTrend(tData);
        setRequestors(r1Data.entries);
        setClaimers(r2Data.entries);
        setApprovers(r3Data.entries);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setCoreLoading(false);
      }
    },
    [],
  );

  const fetchBreakdown = useCallback(async (w: AnalyticsWindow, d: Dim) => {
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/ops/analytics/breakdown?dim=${d}&window=${w}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`breakdown ${res.status}`);
      const data = (await res.json()) as { buckets: BreakdownBucket[] };
      setBreakdown(data.buckets);
    } catch {
      setBreakdown([]);
    } finally {
      setBreakdownLoading(false);
    }
  }, []);

  const fetchHeatmap = useCallback(async (w: AnalyticsWindow) => {
    setHeatmapLoading(true);
    try {
      const res = await fetch(`/api/ops/analytics/breakdown?dim=hour-dow&window=${w}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`heatmap ${res.status}`);
      const data = (await res.json()) as { buckets: HeatmapBucket[] };
      setHeatmap(data.buckets);
    } catch {
      setHeatmap([]);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!role || !canViewAnalytics(role)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch helpers update loading flags eagerly; matches existing pattern in PendingShiftsPanel and shift-activities pages.
    void fetchCore(windowDays);
    void fetchBreakdown(windowDays, dim);
    void fetchHeatmap(windowDays);
  }, [role, windowDays, fetchCore, fetchBreakdown, fetchHeatmap, dim]);

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    );
  }

  if (!role || !canViewAnalytics(role)) {
    return (
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Analytics</h1>
        </div>
        <div className="p-12 border border-zinc-200 rounded-sm bg-zinc-50 text-center">
          <p className="text-sm font-medium text-zinc-800">Analytics are restricted.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Leaders, operations managers, and platform admins can view tenant-wide analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-[1400px]">
      <div className="flex justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Analytics</h1>
          <p className="text-zinc-500 font-medium text-lg max-w-2xl">
            Marketplace flow, fill rate, decline reasons, decision latency, and where shifts are
            posted across your tenant scope.
          </p>
        </div>
        <WindowSwitcher value={windowDays} onChange={setWindowDays} disabled={coreLoading} />
      </div>

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {coreLoading || !summary || !trend ? (
        <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          <span className="text-sm font-medium">Loading analytics for last {windowDays} days…</span>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiTile
              label="Open right now"
              value={formatNumber(summary.openNow.total)}
              sub={
                <>
                  {summary.openNow.claimed} awaiting decision · {summary.openNow.pending} in
                  marketplace
                </>
              }
              icon={Inbox}
            />
            <KpiTile
              label={`Fill rate (${windowDays}d)`}
              value={formatPercent(summary.windowMetrics.fillRate)}
              sub={
                <>
                  {formatNumber(summary.windowMetrics.approved)} of{" "}
                  {formatNumber(summary.windowMetrics.created)} posted
                </>
              }
              icon={CheckCircle2}
              tone="positive"
              sparkline={summary.sparklines.approved}
            />
            <KpiTile
              label={`Decline rate (${windowDays}d)`}
              value={formatPercent(summary.windowMetrics.declineRate)}
              sub={`${formatNumber(summary.windowMetrics.declined)} declines`}
              icon={XCircle}
              tone="negative"
              sparkline={summary.sparklines.declined}
            />
            <KpiTile
              label="Median time to decision"
              value={formatDuration(summary.windowMetrics.medianTimeToDecisionMs)}
              sub={`p90 ${formatDuration(summary.windowMetrics.p90TimeToDecisionMs)}`}
              icon={Timer}
            />
            <KpiTile
              label={`Expired (${windowDays}d)`}
              value={formatNumber(summary.windowMetrics.expired)}
              sub="Posted but never claimed in time"
              icon={Hourglass}
              tone="warning"
              sparkline={summary.sparklines.expired}
            />
            <KpiTile
              label={`Cancelled (${windowDays}d)`}
              value={formatNumber(summary.windowMetrics.cancelled)}
              sub="Withdrawn by the requestor"
              icon={Clock}
            />
            <KpiTile
              label={`Claims made (${windowDays}d)`}
              value={formatNumber(summary.windowMetrics.claimedEvents)}
              sub="Pickups by other agents"
              icon={Activity}
            />
            <KpiTile
              label="Active users (7d)"
              value={formatNumber(summary.activeUsers7d)}
              sub="Distinct logins in the last week"
              icon={Users}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrendStackedArea data={trend.volume} />
            </div>
            <DeclineReasonDonut data={summary.declineReasons} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FillRateLine data={trend.volume} />
            <LatencyP50P90 data={trend.latency} />
          </section>

          <section>
            <BreakdownBars
              dim={dim}
              buckets={breakdown}
              loading={breakdownLoading}
              onDimChange={setDim}
            />
          </section>

          <section>
            <HourDowHeatmap buckets={heatmap} loading={heatmapLoading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Leaderboard role="requestor" entries={requestors} />
            <Leaderboard role="claimer" entries={claimers} />
            <Leaderboard role="approver" entries={approvers} />
          </section>

          <p className="text-[10px] font-medium text-zinc-400 tracking-wider uppercase">
            Window: last {windowDays} days · Generated{" "}
            {new Date(summary.generatedAt).toLocaleString()} ·{" "}
            {ANALYTICS_WINDOWS.map((w) => `${w}d`).join(" / ")} available
          </p>
        </>
      )}
    </div>
  );
}
