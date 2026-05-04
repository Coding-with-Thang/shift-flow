"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { formatSlotRange } from "@/lib/slots";
import { submitShiftTicketDecision, type PublicTicketJson } from "@/lib/tickets/client";
import { canApprove } from "@/lib/rbac";
import {
  DECLINE_REASONS,
  type DeclineReasonKey,
} from "@/lib/analytics/decline-reasons";
import type { Role } from "@prisma/client";
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

type TicketRow = PublicTicketJson;

type DeclineKey = DeclineReasonKey | "";

export function PendingShiftsPanel() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [declineKeyByTicket, setDeclineKeyByTicket] = useState<Record<string, DeclineKey>>({});
  const [declineCustomByTicket, setDeclineCustomByTicket] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/me", { credentials: "include" });
      if (!meRes.ok) {
        throw new Error("Could not load your account");
      }
      const me = (await meRes.json()) as { user?: { role: Role } | null };
      const r = me.user?.role ?? null;
      setRole(r);

      if (!r || !canApprove(r)) {
        setTickets([]);
        return;
      }

      const ticketsRes = await fetch("/api/tickets?view=approvals", { credentials: "include" });
      if (!ticketsRes.ok) {
        const body = (await ticketsRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof body.error === "string" ? body.error : `Failed to load (${ticketsRes.status})`);
      }
      const data = (await ticketsRes.json()) as { tickets?: TicketRow[] };
      setTickets(data.tickets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const declineNotesForTicket = (ticketId: string): string | null => {
    const key = declineKeyByTicket[ticketId] ?? "";
    if (!key) return null;
    if (key === "other") {
      const t = declineCustomByTicket[ticketId]?.trim();
      return t.length > 0 ? t : null;
    }
    const row = DECLINE_REASONS.find((r) => r.key === key);
    return row?.label ?? null;
  };

  const canSubmitDecline = (ticketId: string) => {
    const key = declineKeyByTicket[ticketId] ?? "";
    if (!key) return false;
    if (key === "other") return Boolean(declineCustomByTicket[ticketId]?.trim());
    return true;
  };

  const handleApprove = async (ticket: TicketRow) => {
    setActingId(ticket.id);
    setError(null);
    try {
      await submitShiftTicketDecision(ticket.id, { decision: "APPROVE" });
      setTickets((prev) => prev.filter((x) => x.id !== ticket.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (ticket: TicketRow) => {
    const notes = declineNotesForTicket(ticket.id);
    if (!notes) return;
    setActingId(ticket.id);
    setError(null);
    try {
      await submitShiftTicketDecision(ticket.id, { decision: "DECLINE", notes });
      setTickets((prev) => prev.filter((x) => x.id !== ticket.id));
      setDeclineKeyByTicket((prev) => {
        const next = { ...prev };
        delete next[ticket.id];
        return next;
      });
      setDeclineCustomByTicket((prev) => {
        const next = { ...prev };
        delete next[ticket.id];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decline failed");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        <span className="text-sm font-medium">Loading pending approvals…</span>
      </div>
    );
  }

  if (!role || !canApprove(role)) {
    return (
      <div className="p-12 border border-zinc-200 rounded-sm bg-zinc-50 text-center">
        <p className="text-sm font-medium text-zinc-800">You do not have access to this queue.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Only leaders, operations managers, and super admins can approve or decline claimed shift swaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {tickets.length === 0 ? (
        <AdminTableEmptyCard
          className="p-20 flex flex-col items-center justify-center"
          title="No shifts pending your approval"
          description={
            <p className="text-sm text-zinc-500 font-medium text-center max-w-md">
              When an agent claims an open shift, it appears here until you approve or decline the swap.
            </p>
          }
        />
      ) : (
        <AdminTableRoot>
          <AdminTableScroll>
            <AdminTableTable>
              <AdminTableThead>
                <AdminTableHeaderRow>
                  <AdminTableHeaderCell className="whitespace-nowrap">Date</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">Time</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">Posted by</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">Claimed by</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">Site / team</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">Skill</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="min-w-[240px]">Actions</AdminTableHeaderCell>
                </AdminTableHeaderRow>
              </AdminTableThead>
              <AdminTableBody>
                {tickets.map((t) => {
                  const busy = actingId === t.id;
                  const declineKey = declineKeyByTicket[t.id] ?? "";
                  const showOther = declineKey === "other";
                  return (
                    <AdminTableRow key={t.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {format(parseISO(t.shiftDate), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                        {formatSlotRange(t.startSlot, t.endSlot, false)}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">{t.requestorAlias}</td>
                      <td className="px-4 py-3 text-zinc-800">{t.claimerAlias ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{t.siteTeam ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{t.skillTag ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-800 border border-amber-200 bg-amber-50 px-2 py-1 rounded-sm">
                          Pending approval
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleApprove(t)}
                            className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white bg-black hover:bg-zinc-800 px-3 py-2 rounded-sm transition-colors disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> : <Check className="w-3 h-3" aria-hidden />}
                            Approve
                          </button>

                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500" htmlFor={`decline-reason-${t.id}`}>
                            Decline reason
                          </label>
                          <select
                            id={`decline-reason-${t.id}`}
                            disabled={busy}
                            value={declineKey}
                            onChange={(e) => {
                              const v = e.target.value as DeclineKey;
                              setDeclineKeyByTicket((prev) => ({ ...prev, [t.id]: v }));
                            }}
                            className="w-full border border-zinc-200 rounded-sm px-2 py-1.5 text-xs text-zinc-900 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50"
                          >
                            <option value="">Select a reason…</option>
                            {DECLINE_REASONS.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          {showOther ? (
                            <textarea
                              disabled={busy}
                              value={declineCustomByTicket[t.id] ?? ""}
                              onChange={(e) =>
                                setDeclineCustomByTicket((prev) => ({ ...prev, [t.id]: e.target.value }))
                              }
                              rows={3}
                              placeholder="Type the reason for declining…"
                              className="w-full border border-zinc-200 rounded-sm px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 resize-y min-h-[72px]"
                            />
                          ) : null}
                          <button
                            type="button"
                            disabled={busy || !canSubmitDecline(t.id)}
                            onClick={() => void handleDecline(t)}
                            className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-800 border border-red-200 bg-white hover:bg-red-50 px-3 py-2 rounded-sm transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <X className="w-3 h-3" aria-hidden />
                            Decline
                          </button>
                        </div>
                      </td>
                    </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTableTable>
          </AdminTableScroll>
        </AdminTableRoot>
      )}
    </div>
  );
}
