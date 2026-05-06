"use client";

import { X, Calendar, Clock, Briefcase, Info, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { slotToTime, timeToSlot } from "@/lib/slots";
import { createShiftTicket } from "@/lib/tickets/client";

interface PostShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the ticket is persisted */
  onSuccess?: () => void;
  /** Optional initial kind (user can still change in-modal). */
  kind?: "GIVEAWAY" | "REQUEST";
}

export function PostShiftModal({
  isOpen,
  onClose,
  onSuccess,
  kind = "GIVEAWAY",
}: PostShiftModalProps) {
  const [ticketKind, setTicketKind] = useState<"GIVEAWAY" | "REQUEST">(kind);
  const [role, setRole] = useState("Calls");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [settings, setSettings] = useState<{
    operatingHoursStart: number | null;
    operatingHoursEnd: number | null;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setTicketKind(kind);
  }, [isOpen, kind]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/admin/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.settings) {
            setSettings(data.settings);
          }
        })
        .catch((err) => console.error("Failed to fetch settings", err));
    } else {
      queueMicrotask(() => setValidationError(null));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isQuarterHourTime = (time: string) => {
    const parts = time.split(":");
    if (parts.length !== 2) return false;
    const minutes = Number(parts[1]);
    return Number.isFinite(minutes) && minutes % 15 === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!isQuarterHourTime(startTime) || !isQuarterHourTime(endTime)) {
      setValidationError("Start/end time must be in 15-minute intervals.");
      return;
    }

    const start = timeToSlot(startTime);
    const end = timeToSlot(endTime);

    if (settings) {
      if (
        settings.operatingHoursStart !== null &&
        start < settings.operatingHoursStart
      ) {
        setValidationError(
          `Business opens at ${slotToTime(settings.operatingHoursStart)}. Please adjust start time.`,
        );
        return;
      }
      if (
        settings.operatingHoursEnd !== null &&
        end > settings.operatingHoursEnd
      ) {
        setValidationError(
          `Business closes at ${slotToTime(settings.operatingHoursEnd)}. Please adjust end time.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createShiftTicket({
        shiftDate: date,
        startSlot: start,
        endSlot: end,
        skillTag: role,
        kind: ticketKind,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : ticketKind === "REQUEST"
            ? "Failed to request hours"
            : "Failed to post shift",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRequest = ticketKind === "REQUEST";

  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const parseTimeParts = (time: string): { hour12: number; minute: 0 | 15 | 30 | 45; period: "AM" | "PM" } => {
    const [hStr, mStr] = time.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    const hour24 = Number.isFinite(h) ? h : 0;
    const minute = ([0, 15, 30, 45].includes(m) ? m : 0) as 0 | 15 | 30 | 45;
    const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    const hour12 = ((hour24 % 12) || 12) as number;
    return { hour12, minute, period };
  };

  const toTimeString = (hour12: number, minute: 0 | 15 | 30 | 45, period: "AM" | "PM") => {
    const base = hour12 % 12;
    const hour24 = period === "PM" ? base + 12 : base;
    return `${pad2(hour24)}:${pad2(minute)}`;
  };

  const startParts = parseTimeParts(startTime);
  const endParts = parseTimeParts(endTime);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[500px] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-zinc-100">
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-black flex items-center gap-2">
              {isRequest ? "REQUEST HOURS" : "POST NEW SHIFT"}
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium tracking-wider uppercase mt-1">
              {isRequest ? "Coverage Request Ticket" : "Marketplace Listing Entry"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-8 py-8 flex flex-col gap-6">
            {/* Ticket Kind */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                What are you posting?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "GIVEAWAY" as const, label: "Giving hours away" },
                  { k: "REQUEST" as const, label: "Requesting hours" },
                ].map((row) => (
                  <button
                    key={row.k}
                    type="button"
                    onClick={() => setTicketKind(row.k)}
                    className={`px-4 py-2.5 text-[12px] font-bold border transition-all ${
                      ticketKind === row.k
                        ? "bg-black text-white border-black"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Selection */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                Select Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Calls", "Chat", "Calls - Bilingual", "Chat - Bilingual"].map(
                  (r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-4 py-2.5 text-[12px] font-bold border transition-all ${
                        role === r
                          ? "bg-black text-white border-black"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      {r}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Shift Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
              />
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2.5">
                <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Start Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    aria-label="Start hour"
                    value={startParts.hour12}
                    onChange={(e) =>
                      setStartTime(
                        toTimeString(
                          Number(e.target.value),
                          startParts.minute,
                          startParts.period,
                        ),
                      )
                    }
                    className="w-full border border-zinc-200 px-3 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Start minutes"
                    value={startParts.minute}
                    onChange={(e) =>
                      setStartTime(
                        toTimeString(
                          startParts.hour12,
                          Number(e.target.value) as 0 | 15 | 30 | 45,
                          startParts.period,
                        ),
                      )
                    }
                    className="w-full border border-zinc-200 px-3 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {pad2(m)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Start period"
                    value={startParts.period}
                    onChange={(e) =>
                      setStartTime(
                        toTimeString(
                          startParts.hour12,
                          startParts.minute,
                          e.target.value as "AM" | "PM",
                        ),
                      )
                    }
                    className="w-full border border-zinc-200 px-3 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  End Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    aria-label="End hour"
                    value={endParts.hour12}
                    onChange={(e) =>
                      setEndTime(
                        toTimeString(
                          Number(e.target.value),
                          endParts.minute,
                          endParts.period,
                        ),
                      )
                    }
                    className="w-full border border-zinc-200 px-3 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="End minutes"
                    value={endParts.minute}
                    onChange={(e) =>
                      setEndTime(
                        toTimeString(
                          endParts.hour12,
                          Number(e.target.value) as 0 | 15 | 30 | 45,
                          endParts.period,
                        ),
                      )
                    }
                    className="w-full border border-zinc-200 px-3 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {pad2(m)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="End period"
                    value={endParts.period}
                    onChange={(e) =>
                      setEndTime(
                        toTimeString(
                          endParts.hour12,
                          endParts.minute,
                          e.target.value as "AM" | "PM",
                        ),
                      )
                    }
                    className="w-full border border-zinc-200 px-3 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-[#FAFAFA]"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notice or Error */}
            {validationError ? (
              <div className="bg-red-50 border border-red-100 p-4 flex gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-red-700 font-bold uppercase tracking-wider">
                  {validationError}
                </p>
              </div>
            ) : settings != null &&
              settings.operatingHoursStart !== null &&
              settings.operatingHoursEnd !== null ? (
              <div className="bg-zinc-50 border border-zinc-100 p-4 flex gap-3">
                <Clock className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-zinc-500 italic">
                  Note: Business hours are{" "}
                  {slotToTime(settings.operatingHoursStart)} –{" "}
                  {slotToTime(settings.operatingHoursEnd)}. Shifts must be
                  within this window.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-100 p-4 flex gap-3">
                <Info className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-zinc-500 italic">
                  {isRequest
                    ? "Hour requests are routed to leaders/ops for review."
                    : "Posted shifts are visible to all eligible agents in the marketplace immediately after submission."}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-zinc-300 py-4 text-[11px] font-bold tracking-[0.2em] text-black hover:bg-zinc-50 transition-all uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 bg-black text-white py-4 text-[11px] font-bold tracking-[0.2em] hover:bg-zinc-800 transition-all uppercase disabled:opacity-60 disabled:pointer-events-none"
            >
              {isSubmitting
                ? isRequest
                  ? "Submitting…"
                  : "Posting…"
                : isRequest
                  ? "Confirm & Request Hours"
                  : "Confirm & Post Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
