"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  DECLINE_REASON_KEYS,
  DECLINE_REASON_SHORT_LABELS,
  type DeclineReasonKey,
} from "@/lib/analytics/decline-reasons";
import { formatNumber, formatPercent } from "./formatters";

type Reason = { key: DeclineReasonKey; label: string; count: number };

const COLORS: Record<DeclineReasonKey, string> = {
  coverage: "#0ea5e9",
  policy: "#6366f1",
  eligibility: "#a855f7",
  timing: "#f59e0b",
  duplicate: "#ec4899",
  other: "#71717a",
};

export function DeclineReasonDonut({ data }: { data: Reason[] }) {
  const total = data.reduce((acc, r) => acc + r.count, 0);
  const ordered = DECLINE_REASON_KEYS.map(
    (k) => data.find((d) => d.key === k) ?? { key: k, label: k, count: 0 },
  );
  const filtered = ordered.filter((r) => r.count > 0);
  const ranked = [...ordered].sort((a, b) => b.count - a.count);

  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Why are we declining?</h3>
        <p className="text-xs text-zinc-500 font-medium">
          Decline reasons across the window — bucketed against the 6 preset reasons used at decision time.
        </p>
      </div>

      {total === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">
          No declines in this window.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filtered}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {filtered.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key]} stroke="#ffffff" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatNumber(typeof value === "number" ? value : Number(value) || 0),
                    "Declines",
                  ]}
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 2,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="square"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-3">
              Total declined: {formatNumber(total)}
            </div>
            <ul className="space-y-2">
              {ranked.map((r) => {
                const pct = total > 0 ? r.count / total : 0;
                return (
                  <li key={r.key} className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 shrink-0 rounded-sm"
                      style={{ background: COLORS[r.key] }}
                      aria-hidden
                    />
                    <span className="text-sm text-zinc-800 font-medium flex-1 truncate">
                      {DECLINE_REASON_SHORT_LABELS[r.key]}
                    </span>
                    <span className="text-sm text-zinc-700 font-bold tabular-nums">
                      {formatNumber(r.count)}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium tabular-nums w-12 text-right">
                      {formatPercent(pct)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
