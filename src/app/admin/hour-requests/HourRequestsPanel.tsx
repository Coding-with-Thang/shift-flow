"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { formatSlotRange } from "@/lib/slots";
import { submitShiftTicketDecision, type PublicTicketJson } from "@/lib/tickets/client";
import { canApprove } from "@/lib/rbac";
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

export function HourRequestsPanel() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [declineNotesByTicket, setDeclineNotesByTicket] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/me", { credentials: "include" });
      if (!meRes.ok) throw new Error("Could not load your account");
      const me = (await meRes.json()) as { user?: { role: Role } | null };
      const r = me.user?.role ?? null;
      setRole(r);

      if (!r || !canApprove(r)) {
        setTickets([]);
        return;
      }

      const ticketsRes = await fetch("/api/tickets?view=request-approvals", {
        credentials: "include",
      });
      if (!ticketsRes.ok) {
        const body = (await ticketsRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : `Failed to load (${ticketsRes.status})`,
        );
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

  const canSubmitDecline = (ticketId: string) =>
    Boolean(declineNotesByTicket[ticketId]?.trim());

  const handleDecline = async (ticket: TicketRow) => {
    const notes = declineNotesByTicket[ticket.id]?.trim();
    if (!notes) return;
    setActingId(ticket.id);
    setError(null);
    try {
      await submitShiftTicketDecision(ticket.id, { decision: "DECLINE", notes });
      setTickets((prev) => prev.filter((x) => x.id !== ticket.id));
      setDeclineNotesByTicket((prev) => {
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
        <span className="text-sm font-medium">Loading hour requests…</span>
      </div>
    );
  }

  if (!role || !canApprove(role)) {
    return (
      <div className="p-12 border border-zinc-200 rounded-sm bg-zinc-50 text-center">
        <p className="text-sm font-medium text-zinc-800">
          You do not have access to this queue.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Only leaders, operations managers, and super admins can approve or
          decline hour requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {tickets.length === 0 ? (
        <AdminTableEmptyCard
          className="p-20 flex flex-col items-center justify-center"
          title="No hour requests pending your review"
          description={
            <p className="text-sm text-zinc-500 font-medium text-center max-w-md">
              When an agent requests hours, it appears here until you approve or
              decline the request.
            </p>
          }
        />
      ) : (
        <AdminTableRoot>
          <AdminTableScroll>
            <AdminTableTable>
              <AdminTableThead>
                <AdminTableHeaderRow>
                  <AdminTableHeaderCell className="whitespace-nowrap">
                    Date
                  </AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">
                    Time
                  </AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">
                    Requested by
                  </AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">
                    Site / team
                  </AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">
                    Skill
                  </AdminTableHeaderCell>
                  <AdminTableHeaderCell className="whitespace-nowrap">
                    Status
                  </AdminTableHeaderCell>
                  <AdminTableHeaderCell className="min-w-[260px]">
                    Actions
                  </AdminTableHeaderCell>
                </AdminTableHeaderRow>
              </AdminTableThead>
              <AdminTableBody>
                {tickets.map((t) => {
                  const busy = actingId === t.id;
                  return (
                    <AdminTableRow key={t.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {format(parseISO(t.shiftDate), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                        {formatSlotRange(t.startSlot, t.endSlot, false)}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {t.requestorAlias}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {t.siteTeam ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {t.skillTag ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-800 border border-amber-200 bg-amber-50 px-2 py-1 rounded-sm">
                          Pending review
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2 min-w-[240px]">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleApprove(t)}
                            className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white bg-black hover:bg-zinc-800 px-3 py-2 rounded-sm transition-colors disabled:opacity-50"
                          >
                            {busy ? (
                              <Loader2
                                className="w-3 h-3 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Check className="w-3 h-3" aria-hidden />
                            )}
                            Approve
                          </button>

                          <label
                            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500"
                            htmlFor={`decline-notes-${t.id}`}
                          >
                            Decline notes
                          </label>
                          <textarea
                            id={`decline-notes-${t.id}`}
                            disabled={busy}
                            value={declineNotesByTicket[t.id] ?? ""}
                            onChange={(e) =>
                              setDeclineNotesByTicket((prev) => ({
                                ...prev,
                                [t.id]: e.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Type the reason for declining…"
                            className="w-full border border-zinc-200 rounded-sm px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 resize-y min-h-[72px]"
                          />

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

