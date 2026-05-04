"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { PendingShiftsPanel } from "@/app/admin/pending-shifts/PendingShiftsPanel";
import { canViewAnalytics } from "@/lib/rbac";
import {
  AdminTableRoot,
  AdminTableScroll,
  AdminTableTable,
  AdminTableThead,
  AdminTableHeaderRow,
  AdminTableHeaderCell,
  AdminTableBody,
  AdminTableRow,
  AdminTableEmptyCard,
} from "@/components/admin/AdminTable";
import { AdminLoadMoreBar } from "@/components/admin/AdminListPagination";
import type { Role } from "@prisma/client";

type HistoryItem = {
  id: string;
  ticketId: string;
  action: string;
  createdAt: string;
  actorAlias: string;
  actorUsername: string;
  summary: string;
  ticketStatus: string;
};

function formatAuditAction(action: string): string {
  const rest = action.startsWith("TICKET_") ? action.slice("TICKET_".length) : action;
  return rest
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function ShiftActivitiesPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  const loadHistoryPage = useCallback(async (page: number, append: boolean) => {
    if (append) setHistoryLoadingMore(true);
    else {
      setHistoryLoading(true);
      setHistoryError(null);
    }
    try {
      const res = await fetch(`/api/admin/shift-activities?page=${page}&take=50`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 403) {
          throw new Error("Only leaders, operations managers, and platform admins can view tenant-wide activity.");
        }
        throw new Error(typeof body.error === "string" ? body.error : `Failed to load (${res.status})`);
      }
      const data = (await res.json()) as {
        items?: HistoryItem[];
        hasMore?: boolean;
      };
      const next = data.items ?? [];
      if (append) {
        setHistoryItems((prev) => [...prev, ...next]);
      } else {
        setHistoryItems(next);
      }
      setHistoryHasMore(Boolean(data.hasMore));
      setHistoryPage(page);
    } catch (e) {
      if (!append) setHistoryItems([]);
      setHistoryError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        if (!meRes.ok) {
          if (!cancelled) {
            setHistoryError("Could not load session.");
            setHistoryLoading(false);
            setSessionReady(true);
          }
          return;
        }
        const meData = (await meRes.json()) as { user?: { role: Role } | null };
        const r = meData.user?.role ?? null;
        if (!cancelled) setRole(r);

        if (!r || !canViewAnalytics(r)) {
          if (!cancelled) {
            setHistoryLoading(false);
            setHistoryItems([]);
            setHistoryHasMore(false);
            setSessionReady(true);
          }
          return;
        }

        await loadHistoryPage(1, false);
        if (!cancelled) setSessionReady(true);
      } catch {
        if (!cancelled) {
          setHistoryError("Could not load session.");
          setHistoryLoading(false);
          setSessionReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistoryPage]);

  const canSeeHistory = Boolean(role && canViewAnalytics(role));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Shift Activities</h1>
        <p className="text-zinc-500 font-medium text-lg max-w-2xl">
          Approve or decline claimed swaps that need a decision, and browse the full tenant history of shift ticket
          events for reporting and follow-up.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Pending approvals</h2>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Claimed shifts awaiting your decision — same queue as{" "}
            <Link href="/admin/pending-shifts" className="text-zinc-800 underline underline-offset-2 hover:text-black">
              Pending Shifts
            </Link>
            .
          </p>
        </div>
        <PendingShiftsPanel />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Historical record</h2>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            All posted, claimed, approved, declined, cancelled, and expired shift tickets in your tenant scope
            (newest first).
          </p>
        </div>

        {!sessionReady ? (
          <div className="flex items-center justify-center gap-3 py-16 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span className="text-sm font-medium">Loading…</span>
          </div>
        ) : !canSeeHistory ? (
          <div className="p-12 border border-zinc-200 rounded-sm bg-zinc-50 text-center">
            <p className="text-sm font-medium text-zinc-800">Tenant activity history is restricted.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Leaders, operations managers, and platform admins can view the full shift activity log.
            </p>
          </div>
        ) : historyError ? (
          <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{historyError}</div>
        ) : historyLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span className="text-sm font-medium">Loading activity…</span>
          </div>
        ) : historyItems.length === 0 ? (
          <AdminTableEmptyCard title="No shift ticket events yet" />
        ) : (
          <AdminTableRoot>
            <AdminTableScroll>
              <AdminTableTable>
                <AdminTableThead>
                  <AdminTableHeaderRow>
                    <AdminTableHeaderCell className="whitespace-nowrap">When</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="whitespace-nowrap">Event</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="whitespace-nowrap">Actor</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="whitespace-nowrap">Ticket</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="min-w-[280px]">Summary</AdminTableHeaderCell>
                  </AdminTableHeaderRow>
                </AdminTableThead>
                <AdminTableBody>
                  {historyItems.map((row) => (
                    <AdminTableRow key={row.id}>
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap font-medium">
                        {format(parseISO(row.createdAt), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-700 border border-zinc-200 bg-white px-2 py-1 rounded-sm">
                          {formatAuditAction(row.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        <span className="font-medium">{row.actorAlias}</span>
                        <span className="text-zinc-500 text-xs block font-normal">@{row.actorUsername}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                          {row.ticketStatus}
                        </span>
                        <code className="text-[11px] text-zinc-600 font-mono">{row.ticketId.slice(0, 8)}…</code>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{row.summary}</td>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTableTable>
            </AdminTableScroll>
            <AdminLoadMoreBar
              visible={historyHasMore}
              loading={historyLoadingMore}
              onLoadMore={() => void loadHistoryPage(historyPage + 1, true)}
            />
          </AdminTableRoot>
        )}
      </section>
    </div>
  );
}
