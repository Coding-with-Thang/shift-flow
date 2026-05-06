"use client";

import { CheckCircle2, Headset, Info, MessageSquare, X } from "lucide-react";
import { UserSidebar } from "@/components/UserSidebar";
import { Header } from "@/components/Header";

import { Footer } from "@/components/Footer";
import { ShiftFilters } from "@/components/ShiftFilters";
import { PostShiftModal } from "@/components/PostShiftModal";
import { useFilterStore } from "@/store/useFilterStore";
import { useUserPreferencesStore } from "@/store/useUserPreferencesStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { formatSlotRange } from "@/lib/slots";
import { z } from "zod";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  cancelShiftTicket,
  claimShiftTicket,
  type PublicTicketJson,
} from "@/lib/tickets/client";
import { isAgent } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const filterSchema = z.object({
  workType: z.enum([
    "All",
    "Calls",
    "Chat",
    "Calls - Bilingual",
    "Chat - Bilingual",
  ]),
  timeBucket: z.enum(["All", "Morning", "Mid-Day", "Evening"]),
  dateRange: z.enum(["All", "Today", "Tomorrow", "Next 7 Days"]),
  skills: z.array(z.string()),
  sortBy: z.enum(["Soonest", "Date Asc", "Longest"]),
});

type ShiftData = {
  id: string;
  slotStart: number;
  slotEnd: number;
  role: "Calls" | "Chat" | "Calls - Bilingual" | "Chat - Bilingual";
  poster: string;
  eligible: boolean;
  isMine: boolean;
  kind: "GIVEAWAY" | "REQUEST";
  date: Date;
  skills: string[];
  createdAt: Date;
  status?: string;
  claimerAlias?: string | null;
};

const ROLE_OPTIONS = [
  "Calls",
  "Chat",
  "Calls - Bilingual",
  "Chat - Bilingual",
] as const;

function skillTagToDisplayRole(skillTag: string | null): ShiftData["role"] {
  const tag = skillTag ?? "";
  return (ROLE_OPTIONS as readonly string[]).includes(tag)
    ? (tag as ShiftData["role"])
    : "Calls";
}

function ticketToShiftData(t: PublicTicketJson): ShiftData {
  const role = skillTagToDisplayRole(t.skillTag);
  const isMine = Boolean(t.isMine);
  return {
    id: t.id,
    slotStart: t.startSlot,
    slotEnd: t.endSlot,
    role,
    poster: t.requestorAlias,
    eligible: !isMine,
    isMine,
    kind: t.kind,
    date: new Date(`${t.shiftDate}T12:00:00.000Z`),
    skills: [],
    createdAt: new Date(t.createdAt),
    status: t.status,
    claimerAlias: t.claimerAlias,
  };
}

function isPastShift(date: Date, endSlot: number): boolean {
  const now = new Date();
  const shiftEnd = new Date(date);
  const totalMinutes = endSlot * 15;
  shiftEnd.setUTCHours(0, 0, 0, 0);
  shiftEnd.setUTCMinutes(totalMinutes);
  return now > shiftEnd;
}

/** Claimed shifts list: only APPROVED means admin approved; CLAIMED is still awaiting leader/ops. */
function ClaimedShiftStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase bg-emerald-50 px-3 py-1.5 rounded-sm">
          APPROVED
        </span>
      );
    case "CLAIMED":
      return (
        <span className="text-[10px] font-bold text-amber-800 tracking-widest uppercase border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-sm">
          PENDING APPROVAL
        </span>
      );
    case "DECLINED":
      return (
        <span className="text-[10px] font-bold text-red-700 tracking-widest uppercase border border-red-200 bg-red-50 px-3 py-1.5 rounded-sm">
          DECLINED
        </span>
      );
    case "CANCELLED":
    case "EXPIRED":
      return (
        <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase bg-zinc-100 px-3 py-1.5 rounded-sm">
          {status}
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase bg-zinc-100 px-3 py-1.5 rounded-sm">
          {(status ?? "UNKNOWN").replace(/_/g, " ")}
        </span>
      );
  }
}

const SHIFT_SWAP_SCHEDULE_NOTE =
  "Posting, claiming and approval of shift swaps does not update your schedule nor guarantee schedule was updated. Please check your schedule to ensure action was taken. Follow up with a leader if schedule was not updated after shift swap approved.";

function MarketplaceScheduleDisclaimerNote() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-expanded={open}
        aria-controls="marketplace-schedule-disclaimer"
        aria-label="Note: shift swaps and your schedule"
        onClick={() => setOpen((o) => !o)}
      >
        <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="tooltip"
          id="marketplace-schedule-disclaimer"
          className="absolute left-0 top-full z-60 mt-2 w-[min(22rem,calc(100vw-4rem))] rounded-sm border border-zinc-200 bg-white p-4 text-left text-xs leading-relaxed text-zinc-700 shadow-lg"
        >
          {SHIFT_SWAP_SCHEDULE_NOTE}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const store = useFilterStore();
  const { timeFormat } = useUserPreferencesStore();
  const { setHasNew } = useNotificationStore();

  const [availableShifts, setAvailableShifts] = useState<ShiftData[]>([]);
  const [myListings, setMyListings] = useState<ShiftData[]>([]);
  const [myClaims, setMyClaims] = useState<ShiftData[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [claimingShift, setClaimingShift] = useState<ShiftData | null>(null);
  const [isPostModalOpen, setPostModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);

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

  const loadMarketplace = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tickets?view=dashboard");
      if (!res.ok) {
        setAvailableShifts([]);
        setMyListings([]);
        setMyClaims([]);
        return;
      }
      const data = (await res.json()) as {
        available?: PublicTicketJson[];
        mine?: PublicTicketJson[];
        claimed?: PublicTicketJson[];
      };

      const filterPast = (tickets: PublicTicketJson[]) =>
        (tickets ?? [])
          .map(ticketToShiftData)
          .filter((s) => !isPastShift(s.date, s.slotEnd));

      setAvailableShifts(filterPast(data.available ?? []));
      setMyListings(filterPast(data.mine ?? []));
      setMyClaims(filterPast(data.claimed ?? []));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCancelListing = useCallback(
    async (ticketId: string) => {
      setCancellingId(ticketId);
      try {
        await cancelShiftTicket(ticketId);
        await loadMarketplace();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not cancel listing");
      } finally {
        setCancellingId(null);
      }
    },
    [loadMarketplace],
  );

  const handleConfirmClaim = useCallback(async () => {
    if (!claimingShift) return;
    setClaimSubmitting(true);
    try {
      await claimShiftTicket(claimingShift.id);
      setClaimingShift(null);
      await loadMarketplace();
      setHasNew(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not claim this shift");
    } finally {
      setClaimSubmitting(false);
    }
  }, [claimingShift, loadMarketplace, setHasNew]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadMarketplace();
    });
  }, [loadMarketplace]);

  const [newShiftsCount, setNewShiftsCount] = useState(0);
  useEffect(() => {
    void (async () => {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      setNewShiftsCount(
        availableShifts.filter((s) => s.createdAt.getTime() > twentyFourHoursAgo)
          .length,
      );
    })();
  }, [availableShifts]);

  const filteredAvailable = useMemo(() => {
    try {
      const validQuery = filterSchema.parse({
        workType: store.workType,
        timeBucket: store.timeBucket,
        dateRange: store.dateRange,
        skills: store.skills,
        sortBy: store.sortBy,
      });

      let filtered = [...availableShifts];

      if (validQuery.workType !== "All") {
        filtered = filtered.filter((s) => s.role === validQuery.workType);
      }

      if (validQuery.timeBucket !== "All") {
        filtered = filtered.filter((s) => {
          const start = s.slotStart;
          if (validQuery.timeBucket === "Morning")
            return start >= 0 && start <= 47;
          if (validQuery.timeBucket === "Mid-Day")
            return start >= 48 && start <= 67;
          if (validQuery.timeBucket === "Evening")
            return start >= 68 && start <= 95;
          return true;
        });
      }

      if (validQuery.skills.length > 0) {
        filtered = filtered.filter((s) => validQuery.skills.includes(s.role));
      }

      filtered.sort((a, b) => {
        if (validQuery.sortBy === "Soonest") return a.slotStart - b.slotStart;
        if (validQuery.sortBy === "Date Asc")
          return a.date.getTime() - b.date.getTime();
        if (validQuery.sortBy === "Longest") {
          const lenA =
            a.slotEnd < a.slotStart
              ? a.slotEnd + 96 - a.slotStart
              : a.slotEnd - a.slotStart;
          const lenB =
            b.slotEnd < b.slotStart
              ? b.slotEnd + 96 - b.slotStart
              : b.slotEnd - b.slotStart;
          return lenB - lenA;
        }
        return 0;
      });

      return filtered;
    } catch (err) {
      console.error("Filter validation failed", err);
      return availableShifts;
    }
  }, [
    availableShifts,
    store.workType,
    store.timeBucket,
    store.dateRange,
    store.skills,
    store.sortBy,
  ]);

  const roleLoaded = userRole !== null;
  const canClaim = roleLoaded && isAgent(userRole);

  const renderTable = (
    shifts: ShiftData[],
    emptyMsg: string,
    isActionable = true,
  ) => {
    if (shifts.length === 0) {
      return (
        <div className="border border-dashed border-zinc-300 rounded-sm p-8 flex flex-col items-center justify-center bg-white text-zinc-500 mb-8">
          <span className="text-sm font-medium">{emptyMsg}</span>
        </div>
      );
    }

    return (
      <div className="mb-12">
        <table className="w-full text-left border-collapse bg-white border border-zinc-200 rounded-sm overflow-hidden">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="px-6 py-4 font-bold text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-widest">
                Date
              </th>
              <th className="px-6 py-4 font-bold text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-widest">
                Shift Time
              </th>
              <th className="px-6 py-4 font-bold text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-widest">
                Role
              </th>
              <th className="px-6 py-4 font-bold text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-widest">
                Type
              </th>
              <th className="px-6 py-4 font-bold text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-widest">
                Poster
              </th>
              <th className="px-6 py-4 font-bold text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-widest text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr
                key={shift.id}
                className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors"
              >
                <td className="px-6 py-5 text-sm font-bold text-zinc-900">
                  {format(shift.date, "MMM d, yyyy").toUpperCase()}
                </td>
                <td className="px-6 py-5 text-sm font-medium text-zinc-800">
                  {formatSlotRange(
                    shift.slotStart,
                    shift.slotEnd,
                    timeFormat === "24h",
                  )}
                </td>
                <td className="px-6 py-5 text-sm font-bold text-zinc-900 flex items-center gap-3">
                  {shift.role === "Calls" ? (
                    <Headset className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                  )}
                  {shift.role}
                </td>
                <td className="px-6 py-5">
                  {shift.kind === "REQUEST" ? (
                    <span className="text-[10px] font-bold tracking-widest uppercase border border-sky-200 bg-sky-50 text-sky-800 px-3 py-1.5 rounded-sm whitespace-nowrap">
                      Requesting hours
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold tracking-widest uppercase border border-zinc-200 bg-white text-zinc-800 px-3 py-1.5 rounded-sm whitespace-nowrap">
                      Giving hours
                    </span>
                  )}
                </td>
                <td className="px-6 py-5 text-sm italic text-zinc-500">
                  {shift.isMine ? "You" : shift.poster}
                </td>
                <td className="px-6 py-5 text-right">
                  {shift.isMine ? (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        disabled={cancellingId === shift.id}
                        onClick={() => void handleCancelListing(shift.id)}
                        className="text-[10px] font-bold rounded-sm tracking-widest uppercase border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2 disabled:opacity-50 transition-colors"
                      >
                        {cancellingId === shift.id
                          ? "Cancelling…"
                          : "Cancel listing"}
                      </button>
                    </div>
                  ) : isActionable ? (
                    !roleLoaded ? (
                      <span className="text-[10px] font-bold text-zinc-300 tracking-widest">
                        …
                      </span>
                    ) : shift.kind === "REQUEST" ? (
                      <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                        View only
                      </span>
                    ) : canClaim ? (
                      <button
                        type="button"
                        onClick={() => setClaimingShift(shift)}
                        className="bg-black text-white px-5 py-2 text-[10px] font-bold rounded-sm tracking-widest hover:bg-zinc-800 transition-colors"
                      >
                        CLAIM
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                        Agents only
                      </span>
                    )
                  ) : (
                    <ClaimedShiftStatusBadge status={shift.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 font-sans">
      <UserSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] relative overflow-hidden">
        <Header
          title="Shift Marketplace"
          onPostShiftClick={() => setPostModalOpen(true)}
          titleAside={<MarketplaceScheduleDisclaimerNote />}
        />

        <ShiftFilters />

        <div className="flex-1 overflow-auto p-10">
          <div className="max-w-6xl mx-auto">
            {/* Summary Cards */}
            <div className="flex gap-6 mb-12">
              <div className="bg-white border border-zinc-200 rounded-sm p-6 w-[260px] shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">
                  Available
                </h3>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-extrabold tracking-tighter">
                    {isLoading ? "-" : availableShifts.length}
                  </span>
                  <span className="text-[#60A5FA] text-xs font-bold mb-1">
                    {newShiftsCount > 0 ? `+${newShiftsCount} New` : "No New"}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-sm p-6 w-[260px] shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">
                  My Listings
                </h3>
                <div className="text-4xl font-extrabold tracking-tighter">
                  {isLoading ? "-" : myListings.length}
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-sm p-6 w-[260px] shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">
                  Claimed
                </h3>
                <div className="text-4xl font-extrabold tracking-tighter">
                  {isLoading ? "-" : myClaims.length}
                </div>
              </div>
            </div>

            {/* Available Shifts */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                  Marketplace tickets
                </h2>
              </div>
              {renderTable(
                filteredAvailable,
                "No tickets available matching these criteria.",
              )}
            </section>

            {/* My Listings */}
            <section className="mb-16">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight mb-6">
                My tickets
              </h2>
              {renderTable(
                myListings,
                "You haven't posted any tickets yet.",
              )}
            </section>

            {/* My Claims */}
            <section className="mb-16">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight mb-6">
                Claimed Shifts
              </h2>
              {renderTable(
                myClaims,
                "You haven't claimed any shifts yet.",
                false,
              )}
            </section>
          </div>
        </div>

        {/* Modals */}
        {claimingShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40">
            <div className="bg-white w-full max-w-[540px] shadow-xl flex flex-col">
              <div className="flex justify-between items-center px-8 py-6 border-b border-zinc-200">
                <h2 className="text-[22px] font-bold tracking-tight text-black">
                  CONFIRM SHIFT CLAIM
                </h2>
                <button
                  onClick={() => setClaimingShift(null)}
                  className="text-zinc-900 hover:text-black"
                >
                  <X className="w-5 h-5 stroke-2" />
                </button>
              </div>
              <div className="px-8 py-6 flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900">Position</span>
                    <span className="text-zinc-800">{claimingShift.role}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900">Schedule</span>
                    <span className="text-zinc-800">
                      {formatSlotRange(
                        claimingShift.slotStart,
                        claimingShift.slotEnd,
                        timeFormat === "24h",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900">Location/ID</span>
                    <span className="text-zinc-800">
                      {claimingShift.poster}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold tracking-[0.15em] text-zinc-900 mb-4 uppercase">
                    COMPLIANCE VERIFICATION
                  </div>
                  <div className="flex items-center justify-between border border-zinc-200 p-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 className="w-[22px] h-[22px] text-zinc-900 stroke-2" />
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[13px] font-bold text-zinc-900">
                          Shift Timing
                        </div>
                        <div className="text-[10px] tracking-wide text-zinc-500 uppercase">
                          CURRENT TIME IS BEFORE SHIFT START
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-zinc-900 tracking-wide uppercase">
                      PASS
                    </div>
                  </div>
                </div>
                <div className="bg-[#0f172a] text-white p-5 flex items-start gap-4">
                  <Info className="w-5 h-5 mt-0.5 shrink-0 text-white" />
                  <p className="text-[13px] leading-[1.6] text-zinc-100">
                    By confirming, you agree to fulfill this shift.
                  </p>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    disabled={claimSubmitting}
                    onClick={() => setClaimingShift(null)}
                    className="flex-1 border border-zinc-200 py-3.5 text-[11px] font-bold tracking-widest text-black hover:bg-zinc-50 transition-colors uppercase disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={claimSubmitting}
                    onClick={() => void handleConfirmClaim()}
                    className="flex-1 bg-black text-white py-3.5 text-[11px] font-bold tracking-widest hover:bg-zinc-800 transition-colors uppercase disabled:opacity-50"
                  >
                    {claimSubmitting ? "CLAIMING…" : "CONFIRM CLAIM"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <PostShiftModal
          isOpen={isPostModalOpen}
          onClose={() => setPostModalOpen(false)}
          onSuccess={() => loadMarketplace()}
        />
      </main>
      <Footer />
    </div>
  );
}
