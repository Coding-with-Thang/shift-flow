"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type SparklinePoint = { day: string; value: number };

type Props = {
  label: string;
  value: string | number | null | undefined;
  sub?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  sparkline?: SparklinePoint[] | null;
  /** Optional accent applied to the sparkline fill / stroke. */
  tone?: "neutral" | "positive" | "negative" | "warning";
  className?: string;
};

const TONE_COLORS: Record<NonNullable<Props["tone"]>, { stroke: string; fill: string }> = {
  neutral: { stroke: "#27272a", fill: "#27272a" },
  positive: { stroke: "#16a34a", fill: "#16a34a" },
  negative: { stroke: "#dc2626", fill: "#dc2626" },
  warning: { stroke: "#d97706", fill: "#d97706" },
};

export function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  sparkline,
  tone = "neutral",
  className,
}: Props) {
  const display = value === null || value === undefined ? "—" : String(value);
  const colors = TONE_COLORS[tone];
  const hasSpark = Array.isArray(sparkline) && sparkline.length > 1;
  const gradientId = `spark-${label.replace(/\s+/g, "-")}-${tone}`;

  return (
    <div
      className={cn(
        "border border-[#E2E8F0] p-6 space-y-5 relative overflow-hidden group hover:border-zinc-400 transition-colors flex flex-col justify-between min-h-[160px]",
        className,
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase leading-tight">
          {label}
        </span>
        {Icon ? (
          <Icon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors shrink-0" />
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="text-[36px] font-bold tracking-tighter leading-none text-zinc-900">
          {display}
        </div>
        {sub ? (
          <div className="text-[11px] font-medium text-zinc-500">{sub}</div>
        ) : null}
      </div>

      {hasSpark ? (
        <div className="absolute right-0 bottom-0 w-2/3 h-12 opacity-90 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline!} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.fill} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.stroke}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
