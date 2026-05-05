"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/components/admin/analytics/formatters";

type WindowMetrics = {
  created: number;
  approved: number;
  declined: number;
  expired: number;
  cancelled: number;
  fillRate: number | null;
  declineRate: number | null;
};

const BAR = {
  positive: "bg-green-600",
  negative: "bg-red-600",
  warning: "bg-amber-600",
  neutral: "bg-zinc-400",
} as const;

function OutcomeCell(props: {
  label: string;
  value: string;
  sub: React.ReactNode;
  bar: keyof typeof BAR;
}) {
  const { label, value, sub, bar } = props;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[9px] font-bold text-zinc-400 tracking-[0.18em] uppercase leading-tight">
        {label}
      </span>
      <div className="text-[26px] font-bold tracking-tighter leading-none text-zinc-900 truncate">
        {value}
      </div>
      <div className="text-[11px] font-medium text-zinc-500 leading-snug">{sub}</div>
      <div className={cn("mt-2 h-0.5 w-full rounded-full", BAR[bar])} aria-hidden />
    </div>
  );
}

type Props = {
  windowMetrics: WindowMetrics;
  className?: string;
};

export function OutcomesSummaryCard({ windowMetrics: wm, className }: Props) {
  const decisions = wm.approved + wm.declined;

  return (
    <div
      className={cn(
        "border border-[#E2E8F0] p-6 relative overflow-hidden group hover:border-zinc-400 transition-colors flex flex-col justify-between min-h-[160px]",
        className,
      )}
    >
      <div className="flex justify-between items-start gap-3 mb-5">
        <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase leading-tight">
          Outcomes (30d)
        </span>
        <LayoutGrid className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6">
        <OutcomeCell
          label="Approval rate"
          value={formatPercent(wm.fillRate)}
          sub={
            <>
              {formatNumber(wm.approved)} approved of {formatNumber(wm.created)} posted
            </>
          }
          bar="positive"
        />
        <OutcomeCell
          label="Decline rate"
          value={formatPercent(wm.declineRate)}
          sub={
            <>
              {formatNumber(wm.declined)} declines of {formatNumber(decisions)} decisions
            </>
          }
          bar="negative"
        />
        <OutcomeCell
          label="Cancelled"
          value={formatNumber(wm.cancelled)}
          sub="Withdrawn by the requestor"
          bar="neutral"
        />
        <OutcomeCell
          label="Expired"
          value={formatNumber(wm.expired)}
          sub="Posted but never claimed in time"
          bar="warning"
        />
      </div>
    </div>
  );
}
