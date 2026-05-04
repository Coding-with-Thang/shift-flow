"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDayShort, formatPercent } from "./formatters";

type Volume = {
  day: string;
  created: number;
  approved: number;
  expired: number;
};

export function FillRateLine({ data }: { data: Volume[] }) {
  const series = useMemo(
    () =>
      data.map((d) => ({
        day: d.day,
        fillRate: d.created > 0 ? d.approved / d.created : null,
        expiryRate: d.created > 0 ? d.expired / d.created : null,
      })),
    [data],
  );

  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Fill rate vs expiry rate</h3>
        <p className="text-xs text-zinc-500 font-medium">
          Of all tickets posted on a day: % approved vs % that expired without a claim.
        </p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
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
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
              domain={[0, 1]}
            />
            <Tooltip
              labelFormatter={(label) => formatDayShort(String(label))}
              formatter={(value, name) => [
                formatPercent(typeof value === "number" ? value : null),
                name,
              ]}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 2,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="fillRate"
              name="Fill rate"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="expiryRate"
              name="Expiry rate"
              stroke="#a16207"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-6 text-[11px] font-medium">
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#16a34a]" /> Fill rate (approved ÷ posted)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#a16207]" /> Expiry rate (expired ÷ posted)
        </span>
      </div>
    </div>
  );
}
