"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
  Timer,
  Users,
  XCircle,
  Hourglass,
  Inbox,
} from "lucide-react";
import { KpiTile, type SparklinePoint } from "@/components/admin/analytics/KpiTile";
import { formatDuration, formatNumber, formatPercent } from "@/components/admin/analytics/formatters";
import { canViewAnalytics } from "@/lib/rbac";
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
  declineReasons: { key: string; label: string; count: number }[];
  sparklines: {
    created: SparklinePoint[];
    approved: SparklinePoint[];
    declined: SparklinePoint[];
    expired: SparklinePoint[];
  };
};

type RecentItem = {
  id: string;
  ticketId: string;
  action: string;
  createdAt: string;
  actorAlias: string;
  actorUsername: string;
  summary: string;
  ticketStatus: string;
};

function formatActionLabel(action: string): string {
  const rest = action.startsWith("TICKET_") ? action.slice(7) : action;
  return rest
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function AdminDashboardPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        const meData = (await meRes.json().catch(() => ({}))) as {
          user?: { role: Role } | null;
        };
        const r = meData.user?.role ?? null;
        if (!cancelled) setRole(r);
        if (!r || !canViewAnalytics(r)) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const [sRes, rRes] = await Promise.all([
          fetch("/api/ops/analytics/summary?window=30", { credentials: "include" }),
          fetch("/api/ops/analytics/recent-activity?take=10", {
            credentials: "include",
          }),
        ]);
        if (!sRes.ok) throw new Error(`summary ${sRes.status}`);
        if (!rRes.ok) throw new Error(`recent ${rRes.status}`);
        const sData = (await sRes.json()) as SummaryResponse;
        const rData = (await rRes.json()) as { items: RecentItem[] };
        if (!cancelled) {
          setSummary(sData);
          setRecent(rData.items);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSee = role && canViewAnalytics(role);

  return (
    <div className="space-y-12 max-w-[1400px]">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[44px] font-black tracking-tight text-zinc-900 leading-none mb-4">
            Operations Overview
          </h1>
          <p className="text-xl text-zinc-500 font-medium">
            Real-time activity and rolling 30-day analytics.
          </p>
        </div>
        {canSee ? (
          <Link
            href="/admin/analytics"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-2 rounded-sm transition-colors"
          >
            Full analytics →
          </Link>
        ) : null}
      </div>

      {!canSee ? (
        <div className="p-12 border border-zinc-200 rounded-sm bg-zinc-50 text-center">
          <p className="text-sm font-medium text-zinc-800">
            Analytics are restricted to leaders, operations managers, and platform admins.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn’t load analytics: {error}
        </div>
      ) : loading || !summary ? (
        <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiTile
              label="Open right now"
              value={formatNumber(summary.openNow.total)}
              sub={
                <>
                  <span className="font-semibold">{summary.openNow.claimed}</span> awaiting decision ·{" "}
                  <span className="font-semibold">{summary.openNow.pending}</span> in marketplace
                </>
              }
              icon={Inbox}
            />
            <KpiTile
              label="Fill rate (30d)"
              value={formatPercent(summary.windowMetrics.fillRate)}
              sub={
                <>
                  {formatNumber(summary.windowMetrics.approved)} approved of{" "}
                  {formatNumber(summary.windowMetrics.created)} posted
                </>
              }
              icon={CheckCircle2}
              tone="positive"
              sparkline={summary.sparklines.approved}
            />
            <KpiTile
              label="Decline rate (30d)"
              value={formatPercent(summary.windowMetrics.declineRate)}
              sub={
                <>
                  {formatNumber(summary.windowMetrics.declined)} declines of{" "}
                  {formatNumber(
                    summary.windowMetrics.approved + summary.windowMetrics.declined,
                  )}{" "}
                  decisions
                </>
              }
              icon={XCircle}
              tone="negative"
              sparkline={summary.sparklines.declined}
            />
            <KpiTile
              label="Median time to decision"
              value={formatDuration(summary.windowMetrics.medianTimeToDecisionMs)}
              sub={
                <>
                  p90 {formatDuration(summary.windowMetrics.p90TimeToDecisionMs)}
                </>
              }
              icon={Timer}
            />
            <KpiTile
              label="Expired (30d)"
              value={formatNumber(summary.windowMetrics.expired)}
              sub="Posted but never claimed in time"
              icon={Hourglass}
              tone="warning"
              sparkline={summary.sparklines.expired}
            />
            <KpiTile
              label="Cancelled (30d)"
              value={formatNumber(summary.windowMetrics.cancelled)}
              sub="Withdrawn by the requestor"
              icon={Clock}
            />
            <KpiTile
              label="Claims made (30d)"
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Recent Activities</h2>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Last update: {format(parseISO(summary.generatedAt), "HH:mm:ss")}
                </div>
              </div>
              <div className="border border-[#E2E8F0]">
                {recent.length === 0 ? (
                  <div className="p-12 text-center text-sm text-zinc-400 font-medium">
                    No ticket activity yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-[#E2E8F0]">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                          Ticket
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                          Action
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                          Description
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                          Actor
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-[#E2E8F0] last:border-0 hover:bg-zinc-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-[11px] font-mono text-zinc-700">
                            {row.ticketId.slice(0, 8)}…
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold tracking-widest uppercase text-zinc-700">
                            {formatActionLabel(row.action)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-zinc-600">
                            {row.summary}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="font-bold text-zinc-800">{row.actorAlias}</div>
                            <div className="text-zinc-500">@{row.actorUsername}</div>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-medium text-zinc-400 font-mono whitespace-nowrap">
                            {format(parseISO(row.createdAt), "MMM d HH:mm")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="border border-zinc-200 rounded-sm bg-white p-6">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3">
                  Top decline reasons (30d)
                </h3>
                {summary.declineReasons.every((r) => r.count === 0) ? (
                  <p className="text-sm text-zinc-400 font-medium">No declines in this window.</p>
                ) : (
                  <ul className="space-y-2">
                    {[...summary.declineReasons]
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((r) => (
                        <li key={r.key} className="flex items-center gap-3 text-sm">
                          <span className="flex-1 truncate text-zinc-700">{r.label}</span>
                          <span className="font-bold text-zinc-900 tabular-nums">{r.count}</span>
                        </li>
                      ))}
                  </ul>
                )}
                <div className="mt-4 pt-3 border-t border-zinc-100">
                  <Link
                    href="/admin/analytics"
                    className="text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:text-black"
                  >
                    See full breakdown →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
