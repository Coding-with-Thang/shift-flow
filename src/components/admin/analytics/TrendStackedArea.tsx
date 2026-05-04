"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDayShort } from "./formatters";

type Volume = {
  day: string;
  created: number;
  approved: number;
  declined: number;
  cancelled: number;
  expired: number;
};

const SERIES = [
  { key: "approved", label: "Approved", color: "#16a34a" },
  { key: "declined", label: "Declined", color: "#dc2626" },
  { key: "expired", label: "Expired", color: "#a16207" },
  { key: "cancelled", label: "Cancelled", color: "#a1a1aa" },
] as const;

export function TrendStackedArea({ data }: { data: Volume[] }) {
  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Ticket flow</h3>
          <p className="text-xs text-zinc-500 font-medium">
            Daily lifecycle outcomes (terminal statuses), with the dotted line showing total posted.
          </p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
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
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "#a1a1aa", strokeDasharray: "3 3" }}
              labelFormatter={(label) => formatDayShort(String(label))}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 2,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stackId="status"
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.6}
                isAnimationActive={false}
              />
            ))}
            <Area
              type="monotone"
              dataKey="created"
              name="Posted"
              stroke="#27272a"
              strokeDasharray="4 3"
              fill="none"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
