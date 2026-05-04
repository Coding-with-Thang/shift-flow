"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatDayShort, formatDuration } from "./formatters";

type LatencyDay = {
  day: string;
  toClaim: { p50Ms: number | null; p90Ms: number | null; count: number };
  toDecision: { p50Ms: number | null; p90Ms: number | null; count: number };
};

type Mode = "toClaim" | "toDecision";

const MODE_LABEL: Record<Mode, string> = {
  toClaim: "Time to claim (post → claim)",
  toDecision: "Time to decision (claim → approve/decline)",
};

export function LatencyP50P90({ data }: { data: LatencyDay[] }) {
  const [mode, setMode] = useState<Mode>("toDecision");

  const chartData = data.map((d) => ({
    day: d.day,
    p50: d[mode].p50Ms ?? 0,
    p90: d[mode].p90Ms ?? 0,
    count: d[mode].count,
  }));

  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="flex justify-between items-end mb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Decision latency</h3>
          <p className="text-xs text-zinc-500 font-medium">
            Median (p50) and 90th percentile (p90) per day. {MODE_LABEL[mode]}.
          </p>
        </div>
        <div
          role="tablist"
          className="inline-flex border border-zinc-200 rounded-sm overflow-hidden bg-white"
        >
          {(["toClaim", "toDecision"] as const).map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-r border-zinc-200 last:border-r-0 transition-colors",
                  active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50",
                )}
              >
                {m === "toClaim" ? "To claim" : "To decision"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={formatDayShort}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => formatDuration(v)}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <Tooltip
              labelFormatter={(label) => formatDayShort(String(label))}
              formatter={(value, name) => [
                formatDuration(typeof value === "number" ? value : Number(value) || 0),
                name,
              ]}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 2,
                fontSize: 12,
              }}
            />
            <Bar dataKey="p50" name="p50" fill="#27272a" isAnimationActive={false} />
            <Bar dataKey="p90" name="p90" fill="#a1a1aa" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-6 text-[11px] font-medium">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#27272a]" /> p50 (median)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#a1a1aa]" /> p90
        </span>
      </div>
    </div>
  );
}
