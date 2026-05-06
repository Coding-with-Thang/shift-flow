"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  MoreVertical,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { UserSidebar } from "@/components/UserSidebar";
import { Header } from "@/components/Header";
import { useUserPreferencesStore } from "@/store/useUserPreferencesStore";
import { formatSlotRange } from "@/lib/slots";
import { cn } from "@/lib/utils";
import { cancelShiftTicket, type PublicTicketJson } from "@/lib/tickets/client";
import { PostShiftModal } from "@/components/PostShiftModal";
import { isAgent } from "@/lib/rbac";
import type { Role } from "@prisma/client";

function formatShiftDayLabel(isoDate: string): string {
  return format(parseISO(isoDate), "MMM d").toUpperCase();
}

function rel(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function givenAwayBadge(status: string): { label: string; variant: "approved" | "pending" | "muted" | "danger" } {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", variant: "approved" };
    case "PENDING":
    case "CLAIMED":
      return { label: "Pending", variant: "pending" };
    case "EXPIRED":
      return { label: "Expired", variant: "muted" };
    case "DECLINED":
      return { label: "Declined", variant: "danger" };
    case "CANCELLED":
      return { label: "Cancelled", variant: "muted" };
    default:
      return { label: status, variant: "pending" };
  }
}

function takenBadge(status: string): { label: string; variant: "approved" | "pending" | "muted" } {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", variant: "approved" };
    case "CLAIMED":
      return { label: "Pending Approval", variant: "pending" };
    case "DECLINED":
      return { label: "Declined", variant: "muted" };
    case "EXPIRED":
      return { label: "Expired", variant: "muted" };
    case "CANCELLED":
      return { label: "Cancelled", variant: "muted" };
    default:
      return { label: status, variant: "pending" };
  }
}

function givenAwayFooter(t: PublicTicketJson): string {
  switch (t.status) {
    case "PENDING":
      return `Posted ${rel(t.createdAt)}`;
    case "CLAIMED":
      return `Pending approval · ${rel(t.updatedAt)}`;
    case "APPROVED":
      return t.decidedAt ? `Processed ${rel(t.decidedAt)}` : `Updated ${rel(t.updatedAt)}`;
    case "EXPIRED":
      return `Archived ${rel(t.updatedAt)}`;
    case "DECLINED":
      return t.decidedAt ? `Declined ${rel(t.decidedAt)}` : `Updated ${rel(t.updatedAt)}`;
    case "CANCELLED":
      return `Cancelled · ${rel(t.updatedAt)}`;
    default:
      return rel(t.updatedAt);
  }
}

function takenFooter(t: PublicTicketJson): string {
  switch (t.status) {
    case "APPROVED":
      return t.decidedAt ? `Acquired ${rel(t.decidedAt)}` : `Updated ${rel(t.updatedAt)}`;
    case "CLAIMED":
      return `Claim submitted ${rel(t.updatedAt)}`;
    case "DECLINED":
      return t.decidedAt ? `Declined ${rel(t.decidedAt)}` : `Updated ${rel(t.updatedAt)}`;
    case "EXPIRED":
      return `Expired ${rel(t.updatedAt)}`;
    case "CANCELLED":
      return `Cancelled · ${rel(t.updatedAt)}`;
    default:
      return rel(t.updatedAt);
  }
}

export default function MyActivityPage() {
  const { timeFormat } = useUserPreferencesStore();
  const formatTime = (start: number, end: number) => formatSlotRange(start, end, timeFormat === "24h");

  const [givenAway, setGivenAway] = useState<PublicTicketJson[]>([]);
  const [taken, setTaken] = useState<PublicTicketJson[]>([]);
  const [requested, setRequested] = useState<PublicTicketJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { user?: { role: Role } | null };
      if (!cancelled && data.user?.role) setUserRole(data.user.role);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, tRes, rRes] = await Promise.all([
        fetch("/api/tickets?view=mine"),
        fetch("/api/tickets?view=claimed"),
        fetch("/api/tickets?view=my-requests"),
      ]);
      if (gRes.ok) {
        const g = (await gRes.json()) as { tickets?: PublicTicketJson[] };
        setGivenAway(g.tickets ?? []);
      } else {
        setGivenAway([]);
      }
      if (tRes.ok) {
        const t = (await tRes.json()) as { tickets?: PublicTicketJson[] };
        setTaken(t.tickets ?? []);
      } else {
        setTaken([]);
      }
      if (rRes.ok) {
        const r = (await rRes.json()) as { tickets?: PublicTicketJson[] };
        setRequested(r.tickets ?? []);
      } else {
        setRequested([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancelListing = useCallback(
    async (ticketId: string) => {
      setCancellingId(ticketId);
      try {
        await cancelShiftTicket(ticketId);
        await load();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not cancel listing");
      } finally {
        setCancellingId(null);
      }
    },
    [load],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 font-sans">
      <UserSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] relative overflow-hidden">
        <Header title="My Activity" />

        <div className="flex-1 overflow-auto p-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between mb-12">
              <div className="max-w-xl">
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-black">My Activity</h1>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Audit log of your historical and pending shift transfers. All timestamps are displayed in 15-minute operational intervals.
                </p>
              </div>
              <div className="flex gap-3">
                {userRole !== null && isAgent(userRole) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRequestModalOpen(true)}
                      className="bg-white text-black border border-zinc-200 px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-zinc-50 hover:border-zinc-300 transition-colors rounded-sm inline-block text-center"
                    >
                      Request Hours
                    </button>
                    <Link
                      href="/marketplace"
                      className="bg-black text-white px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors rounded-sm inline-block text-center"
                    >
                      Post Shift
                    </Link>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-black pb-3">
                  <h2 className="text-[11px] font-bold tracking-widest uppercase text-black">Shifts I&apos;ve Given Away</h2>
                  <span className="text-[11px] text-zinc-500">
                    {loading ? "…" : `${givenAway.length} total records`}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {loading ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : givenAway.length === 0 ? (
                    <p className="text-sm text-zinc-500">No shifts posted yet.</p>
                  ) : (
                    givenAway.map((shift) => {
                      const badge = givenAwayBadge(shift.status);
                      const expired = shift.status === "EXPIRED";
                      return (
                        <div
                          key={shift.id}
                          className={cn(
                            "border border-zinc-200 p-5 rounded-sm flex justify-between items-start",
                            expired && "bg-zinc-100/50",
                          )}
                        >
                          <div className="flex flex-col gap-3 w-full">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "font-bold text-xs font-mono break-all",
                                  expired ? "text-zinc-400" : "text-black",
                                )}
                              >
                                {shift.id}
                              </span>
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm",
                                  badge.variant === "approved" && "bg-black text-white",
                                  badge.variant === "pending" && "border border-zinc-300 text-black",
                                  badge.variant === "muted" && "bg-zinc-200 text-zinc-500",
                                  badge.variant === "danger" && "border border-red-200 text-red-700 bg-red-50",
                                )}
                              >
                                {badge.variant === "approved" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : badge.variant === "pending" ? (
                                  <Clock className="w-3.5 h-3.5" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                <span>{badge.label}</span>
                              </div>
                            </div>
                            <div
                              className={cn(
                                "text-xs font-medium",
                                expired ? "text-zinc-500" : "text-black",
                              )}
                            >
                              {formatShiftDayLabel(shift.shiftDate)} • {formatTime(shift.startSlot, shift.endSlot)}
                            </div>
                            <div className="flex items-center justify-between mt-1 gap-3">
                              <div className="min-w-0 flex-1">
                                {shift.status === "PENDING" && (
                                  <div className="text-xs text-black font-medium mb-0.5">
                                    Unclaimed{" "}
                                    <span className="text-zinc-500 font-normal italic">• Available in Marketplace</span>
                                  </div>
                                )}
                                {(shift.status === "CLAIMED" || shift.status === "APPROVED") && shift.claimerAlias && (
                                  <div className="text-xs text-zinc-500 mb-0.5">
                                    Claimed by{" "}
                                    <span className="text-black font-bold">{shift.claimerAlias}</span>
                                  </div>
                                )}
                                {shift.status === "EXPIRED" && (
                                  <div className="text-xs text-zinc-500 italic mb-0.5">
                                    Requirement unmet by deadline
                                  </div>
                                )}
                                {shift.status === "DECLINED" && (
                                  <div className="text-xs text-zinc-500 mb-0.5">Swap was declined.</div>
                                )}
                                <div className="text-[11px] text-zinc-400">{givenAwayFooter(shift)}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {shift.status === "PENDING" && (
                                  <button
                                    type="button"
                                    disabled={cancellingId === shift.id}
                                    onClick={() => void handleCancelListing(shift.id)}
                                    className="text-[10px] font-bold tracking-widest uppercase border border-red-200 text-red-700 hover:bg-red-50 px-3 py-2 rounded-sm transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                                  >
                                    {cancellingId === shift.id ? "…" : "Cancel"}
                                  </button>
                                )}
                                {!expired && shift.status !== "PENDING" && (
                                  <button type="button" className="text-zinc-400 hover:text-black transition-colors" aria-label="More actions">
                                    <MoreVertical className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-black pb-3">
                  <h2 className="text-[11px] font-bold tracking-widest uppercase text-black">Shifts I&apos;ve Taken</h2>
                  <span className="text-[11px] text-zinc-500">
                    {loading ? "…" : `${taken.length} total records`}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {loading ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : taken.length === 0 ? (
                    <p className="text-sm text-zinc-500">No claimed shifts yet.</p>
                  ) : (
                    taken.map((shift) => {
                      const badge = takenBadge(shift.status);
                      const approved = shift.status === "APPROVED";
                      return (
                        <div key={shift.id} className="border border-zinc-200 p-5 rounded-sm flex justify-between items-start">
                          <div className="flex flex-col gap-3 w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs font-mono text-black break-all">{shift.id}</span>
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm",
                                  badge.variant === "approved" && "bg-black text-white",
                                  badge.variant === "pending" && "border border-zinc-300 text-black",
                                  badge.variant === "muted" && "bg-zinc-200 text-zinc-500",
                                )}
                              >
                                {badge.variant === "approved" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                                <span>{badge.label}</span>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-black">
                              {formatShiftDayLabel(shift.shiftDate)} • {formatTime(shift.startSlot, shift.endSlot)}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div>
                                <div className="text-xs text-zinc-500 mb-0.5">
                                  Posted by{" "}
                                  <span className="text-black font-bold">{shift.requestorAlias}</span>
                                </div>
                                <div className="text-[11px] text-zinc-400">{takenFooter(shift)}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                {approved ? (
                                  <button type="button" className="text-zinc-400 hover:text-black transition-colors" aria-label="View">
                                    <Eye className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <button type="button" className="text-zinc-400 hover:text-black transition-colors" aria-label="Pending">
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                )}
                                <button type="button" className="text-zinc-400 hover:text-black transition-colors" aria-label="More actions">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-center justify-between border-b border-black pb-3">
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-black">
                  Hours I&apos;ve Requested
                </h2>
                <span className="text-[11px] text-zinc-500">
                  {loading ? "…" : `${requested.length} total records`}
                </span>
              </div>
              <div className="flex flex-col gap-4 mt-6">
                {loading ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : requested.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hour requests yet.</p>
                ) : (
                  requested.map((t) => {
                    const badge = givenAwayBadge(t.status);
                    return (
                      <div
                        key={t.id}
                        className="border border-zinc-200 p-5 rounded-sm flex justify-between items-start bg-white"
                      >
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs font-mono text-black break-all">
                              {t.id}
                            </span>
                            <div
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm",
                                badge.variant === "approved" && "bg-black text-white",
                                badge.variant === "pending" &&
                                  "border border-zinc-300 text-black",
                                badge.variant === "muted" && "bg-zinc-200 text-zinc-500",
                                badge.variant === "danger" &&
                                  "border border-red-200 text-red-700 bg-red-50",
                              )}
                            >
                              <span>{badge.label}</span>
                            </div>
                          </div>
                          <div className="text-xs font-medium text-black">
                            {formatShiftDayLabel(t.shiftDate)} •{" "}
                            {formatTime(t.startSlot, t.endSlot)}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {givenAwayFooter(t)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PostShiftModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => load()}
        kind="REQUEST"
      />
    </div>
  );
}
