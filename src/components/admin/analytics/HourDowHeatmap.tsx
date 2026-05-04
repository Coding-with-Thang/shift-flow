"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "./formatters";

export type HeatmapBucket = {
  key: string;
  label: string;
  created: number;
  approved: number;
  hour?: number;
  dow?: number;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  buckets: HeatmapBucket[];
  loading?: boolean;
};

/**
 * 7-row × 24-col heatmap of where shifts are posted (by `shiftDate` day-of-week and
 * `startSlot` rolled to hour-of-day). Color intensity scales with `created` count.
 */
export function HourDowHeatmap({ buckets, loading }: Props) {
  const cells = new Map<string, HeatmapBucket>();
  let max = 0;
  for (const b of buckets) {
    if (b.dow === undefined || b.hour === undefined) continue;
    cells.set(`${b.dow}-${b.hour}`, b);
    if (b.created > max) max = b.created;
  }

  const intensity = (n: number) => {
    if (max === 0) return 0;
    return Math.min(1, Math.max(0.04, n / max));
  };

  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">When are shifts posted?</h3>
        <p className="text-xs text-zinc-500 font-medium">
          Tickets posted in the window, grouped by their <span className="font-semibold">scheduled</span> day-of-week
          (rows) and hour-of-day (columns). Darker = more activity.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">Loading…</div>
      ) : max === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">
          No shifts to plot in this window.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div
              className="grid gap-px bg-zinc-100 p-px rounded-sm"
              style={{ gridTemplateColumns: "auto repeat(24, minmax(20px, 1fr))" }}
            >
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className={cn(
                    "text-[9px] font-bold text-zinc-400 text-center pb-1 bg-white",
                    h % 3 === 0 ? "" : "text-transparent",
                  )}
                  aria-hidden={h % 3 !== 0}
                >
                  {h.toString().padStart(2, "0")}
                </div>
              ))}

              {Array.from({ length: 7 }, (_, d) => (
                <DowRow key={d} d={d} cells={cells} max={max} intensity={intensity} />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
              <span>Less</span>
              <div className="flex gap-px">
                {[0.04, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                  <span
                    key={v}
                    className="w-4 h-3 rounded-sm"
                    style={{ background: `rgba(39, 39, 42, ${v})` }}
                    aria-hidden
                  />
                ))}
              </div>
              <span>More</span>
              <span className="ml-3 text-zinc-500">Peak: {formatNumber(max)} posts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DowRow({
  d,
  cells,
  max,
  intensity,
}: {
  d: number;
  cells: Map<string, HeatmapBucket>;
  max: number;
  intensity: (n: number) => number;
}) {
  return (
    <>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pr-2 flex items-center bg-white">
        {DOW_LABELS[d]}
      </div>
      {Array.from({ length: 24 }, (_, h) => {
        const cell = cells.get(`${d}-${h}`);
        const n = cell?.created ?? 0;
        const i = intensity(n);
        return (
          <div
            key={h}
            className="aspect-square min-h-[20px]"
            style={{
              background: n === 0 ? "#fafafa" : `rgba(39, 39, 42, ${i})`,
            }}
            title={`${DOW_LABELS[d]} ${h.toString().padStart(2, "0")}:00 — ${n} posted${
              cell ? `, ${cell.approved} approved` : ""
            }${max > 0 && n > 0 ? ` (${Math.round((n / max) * 100)}% of peak)` : ""}`}
          />
        );
      })}
    </>
  );
}
