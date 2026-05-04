"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "./formatters";

export type BreakdownBucket = {
  key: string;
  label: string;
  created: number;
  approved: number;
  declined: number;
  expired: number;
  cancelled: number;
  pending: number;
  claimed: number;
  fillRate: number | null;
};

type Dim = "site" | "skill" | "hour" | "dow";

const DIMS: { value: Dim; label: string }[] = [
  { value: "site", label: "Site / team" },
  { value: "skill", label: "Skill" },
  { value: "hour", label: "Hour of day" },
  { value: "dow", label: "Day of week" },
];

const SERIES = [
  { key: "approved", label: "Approved", color: "#16a34a" },
  { key: "declined", label: "Declined", color: "#dc2626" },
  { key: "expired", label: "Expired", color: "#a16207" },
  { key: "cancelled", label: "Cancelled", color: "#a1a1aa" },
  { key: "pending", label: "Pending", color: "#0ea5e9" },
  { key: "claimed", label: "Awaiting decision", color: "#6366f1" },
] as const;

type Props = {
  dim: Dim;
  buckets: BreakdownBucket[];
  loading?: boolean;
  onDimChange: (dim: Dim) => void;
};

export function BreakdownBars({ dim, buckets, loading, onDimChange }: Props) {
  const filtered = buckets.filter((b) => b.created > 0);
  const top =
    dim === "site" || dim === "skill" ? filtered.slice(0, 12) : filtered;

  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="flex justify-between items-end mb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Breakdown</h3>
          <p className="text-xs text-zinc-500 font-medium">
            Tickets posted in the window, sliced by the selected dimension and stacked by outcome.
          </p>
        </div>
        <div
          role="tablist"
          className="inline-flex border border-zinc-200 rounded-sm overflow-hidden bg-white"
        >
          {DIMS.map((d) => {
            const active = d.value === dim;
            return (
              <button
                key={d.value}
                role="tab"
                aria-selected={active}
                onClick={() => onDimChange(d.value)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-r border-zinc-200 last:border-r-0 transition-colors",
                  active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">
          Loading breakdown…
        </div>
      ) : top.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">
          No tickets to break down for this dimension and window.
        </div>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  interval={0}
                  angle={dim === "site" || dim === "skill" ? -20 : 0}
                  textAnchor={dim === "site" || dim === "skill" ? "end" : "middle"}
                  height={dim === "site" || dim === "skill" ? 60 : 30}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(244, 244, 245, 0.5)" }}
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 2,
                    fontSize: 12,
                  }}
                />
                <Legend iconType="square" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    stackId="status"
                    name={s.label}
                    fill={s.color}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <th className="px-2 py-2">Bucket</th>
                  <th className="px-2 py-2 text-right">Posted</th>
                  <th className="px-2 py-2 text-right">Approved</th>
                  <th className="px-2 py-2 text-right">Declined</th>
                  <th className="px-2 py-2 text-right">Expired</th>
                  <th className="px-2 py-2 text-right">Fill rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {top.map((b) => (
                  <tr key={b.key}>
                    <td className="px-2 py-2 text-zinc-800 font-medium">{b.label}</td>
                    <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
                      {formatNumber(b.created)}
                    </td>
                    <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
                      {formatNumber(b.approved)}
                    </td>
                    <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
                      {formatNumber(b.declined)}
                    </td>
                    <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
                      {formatNumber(b.expired)}
                    </td>
                    <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
                      {formatPercent(b.fillRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
