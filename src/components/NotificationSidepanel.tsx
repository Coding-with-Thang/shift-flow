"use client";

import { CheckCircle2, History, Info, X, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { PublicTicketJson } from "@/lib/tickets/client";
import { formatSlotRange } from "@/lib/slots";
import { useUserPreferencesStore } from "@/store/useUserPreferencesStore";

type ActivityItem = {
  id: string;
  ticketId: string;
  action: string;
  createdAt: string;
  badge: "APPROVED" | "POSTED" | "CLAIMED" | "DECLINED";
  summary: string;
};

interface NotificationSidepanelProps {
  isOpen: boolean;
  onClose: () => void;
  activityItems: ActivityItem[];
  loading: boolean;
  onViewTicket: (ticketId: string) => void;
  lastCheckedAt?: string | null;
}

function formatActivityTimeLabel(iso: string): string {
  const d = parseISO(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "NOW";
  if (diffMs < 24 * 60 * 60 * 1000) {
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `${mins} MIN AGO`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} HR AGO`;
  }
  return format(d, "MMM d, yyyy").toUpperCase();
}

function ticketDisplayCode(id: string): string {
  return `TK-${id.slice(0, 8).toUpperCase()}`;
}

function activityBadgeStyles(badge: ActivityItem["badge"]) {
  switch (badge) {
    case "APPROVED":
      return "bg-[#0f172a] text-white";
    case "POSTED":
      return "border border-zinc-300 text-zinc-600";
    case "CLAIMED":
      return "bg-zinc-100 text-zinc-600";
    case "DECLINED":
      return "border border-zinc-200 text-zinc-400";
    default:
      return "border border-zinc-300 text-zinc-600";
  }
}

function ActivityIcon({ badge }: { badge: ActivityItem["badge"] }) {
  const cls = "w-5 h-5 shrink-0 mt-0.5";
  switch (badge) {
    case "APPROVED":
      return <CheckCircle2 className={`${cls} text-zinc-900`} />;
    case "POSTED":
      return <History className={`${cls} text-zinc-900`} />;
    case "CLAIMED":
      return <Info className={`${cls} text-[#60A5FA]`} />;
    case "DECLINED":
      return <XCircle className={`${cls} text-zinc-400`} />;
  }
}

export function TicketStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>APPROVED</span>
        </div>
      );
    case "DECLINED":
      return (
        <div className="flex items-center gap-1.5 border border-zinc-300 text-zinc-600 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
          <XCircle className="w-3.5 h-3.5" />
          <span>DECLINED</span>
        </div>
      );
    case "CLAIMED":
      return (
        <div className="flex items-center gap-1.5 border border-zinc-300 text-zinc-600 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
          <History className="w-3.5 h-3.5" />
          <span>CLAIMED</span>
        </div>
      );
    case "PENDING":
      return (
        <div className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
          <Info className="w-3.5 h-3.5" />
          <span>PENDING</span>
        </div>
      );
    default:
      return (
        <div className="bg-zinc-100 text-zinc-700 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
          {status.replace(/_/g, " ")}
        </div>
      );
  }
}

export function NotificationSidepanel({
  isOpen,
  onClose,
  activityItems,
  loading,
  onViewTicket,
  lastCheckedAt,
}: NotificationSidepanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[360px] bg-white border-l border-zinc-200 z-100 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="px-6 py-6 border-b border-zinc-200 flex items-start justify-between bg-zinc-50/50">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold tracking-tight text-zinc-900">
            Shift Notifications
          </h2>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
            {activityItems.length} Total Activities
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white flex flex-col">
        {loading ? (
          <div className="p-6 text-sm text-zinc-500">Loading activity…</div>
        ) : activityItems.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">
            No recent ticket activity yet.
          </div>
        ) : (
          activityItems.map((item) => {
            const isNew = lastCheckedAt
              ? new Date(item.createdAt) > new Date(lastCheckedAt)
              : false;

            return (
              <div
                key={item.id}
                className={`p-6 border-b border-zinc-100 flex gap-4 transition-colors relative group ${isNew ? "bg-blue-50/30" : "hover:bg-zinc-50/50"}`}
              >
                {isNew && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                )}
                <ActivityIcon badge={item.badge} />
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                        {formatActivityTimeLabel(item.createdAt)}
                      </span>
                      {isNew && (
                        <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-[2px] tracking-tighter uppercase">
                          NEW
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm ${activityBadgeStyles(item.badge)}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-800 leading-snug">
                    {item.summary}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-zinc-400 italic">
                      ID: {ticketDisplayCode(item.ticketId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewTicket(item.ticketId)}
                      className="text-[10px] font-bold text-zinc-900 tracking-wider uppercase border-b border-zinc-900 pb-0.5 hover:text-zinc-600 transition-colors"
                    >
                      VIEW TICKET
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-6 border-t border-zinc-200 bg-white">
        <button
          className="w-full bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold tracking-widest uppercase py-3.5 rounded-sm transition-colors"
          onClick={onClose}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}

interface TicketModalProps {
  ticket: PublicTicketJson | null;
  loading: boolean;
  onClose: () => void;
}

export function TicketModal({ ticket, loading, onClose }: TicketModalProps) {
  const { timeFormat } = useUserPreferencesStore();
  if (!ticket && !loading) return null;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-zinc-900/40">
      <div className="bg-[#f9fafb] w-full max-w-[480px] shadow-2xl flex flex-col font-sans">
        {loading ? (
          <div className="p-8 text-sm text-zinc-500">Loading ticket…</div>
        ) : ticket ? (
          <div className="p-8 pb-6 flex flex-col gap-6">
            <div className="flex justify-between items-center gap-3">
              <span className="text-[15px] font-bold text-black">
                {ticketDisplayCode(ticket.id)}
              </span>
              <TicketStatusBadge status={ticket.status} />
            </div>

            <div className="flex justify-between pt-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                  DATE
                </span>
                <span className="text-[13px] font-bold text-black">
                  {format(
                    parseISO(ticket.shiftDate),
                    "MMM d, yyyy",
                  ).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[120px]">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                  INTERVAL
                </span>
                <span className="text-[13px] font-bold text-black">
                  {formatSlotRange(
                    ticket.startSlot,
                    ticket.endSlot,
                    timeFormat === "24h",
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-4 border-b border-zinc-300 pb-6">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                ROLE
              </span>
              <span className="text-[13px] font-bold text-black">
                {ticket.skillTag ?? "Calls"}
              </span>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <div className="flex justify-between items-center gap-4">
                <span className="text-[11px] text-zinc-800 shrink-0">
                  CREATED_AT
                </span>
                <span className="text-[11px] text-zinc-800 font-medium text-right">
                  {format(parseISO(ticket.createdAt), "yyyy-MM-dd HH:mm:ss")}{" "}
                  UTC
                </span>
              </div>
              {ticket.decidedAt ? (
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[11px] text-zinc-800 shrink-0">
                    DECIDED_AT
                  </span>
                  <span className="text-[11px] text-zinc-800 font-medium text-right">
                    {format(parseISO(ticket.decidedAt), "yyyy-MM-dd HH:mm:ss")}{" "}
                    UTC
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="p-8 text-sm text-zinc-600">
            This ticket could not be loaded.
          </div>
        )}

        <div className="px-8 pb-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-black hover:bg-zinc-800 transition-colors text-white py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase"
          >
            CLOSE TICKET
          </button>
        </div>
      </div>
    </div>
  );
}
