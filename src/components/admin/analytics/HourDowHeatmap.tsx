"use client";

import { cn } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/constants";
import { formatNumber } from "./formatters";

export type HeatmapBucket = {
  key: string;
  label: string;
  created: number;
  approved: number;
  posted: number;
  claims: number;
  hour?: number;
  dow?: number;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  buckets: HeatmapBucket[];
  loading?: boolean;
};

function heatmapCells(buckets: HeatmapBucket[]) {
  const cells = new Map<string, HeatmapBucket>();
  for (const b of buckets) {
    if (b.dow === undefined || b.hour === undefined) continue;
    cells.set(`${b.dow}-${b.hour}`, b);
  }
  return cells;
}

function maxMetric(cells: Map<string, HeatmapBucket>, pick: (b: HeatmapBucket) => number) {
  let max = 0;
  for (const b of cells.values()) {
    const n = pick(b);
    if (n > max) max = n;
  }
  return max;
}

function intensity(n: number, max: number) {
  if (max === 0) return 0;
  return Math.min(1, Math.max(0.04, n / max));
}

/**
 * Two 7×24 heatmaps comparing marketplace activity by wall-clock time:
 * ticket creation vs claim audit events (same window as the rest of analytics).
 */
export function HourDowHeatmap({ buckets, loading }: Props) {
  const cells = heatmapCells(buckets);
  const maxPosted = maxMetric(cells, (b) => b.posted ?? 0);
  const maxClaims = maxMetric(cells, (b) => b.claims ?? 0);

  const tzShort =
    APP_TIMEZONE === "America/Winnipeg" ? "Winnipeg (Central)" : APP_TIMEZONE;

  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
          When are shifts posted vs when shifts are claimed?
        </h3>
        <p className="text-xs text-zinc-500 font-medium max-w-3xl">
          Two views of the same date range:{" "}
          <span className="font-semibold text-zinc-700">Posted</span> counts tickets when they hit
          the marketplace (creation time).{" "}
          <span className="font-semibold text-zinc-700">Claimed</span> counts pickups using claim
          timestamps. Both use wall-clock day-of-week (rows) and hour (columns) in{" "}
          <span className="font-semibold">{tzShort}</span>. Darker = more activity.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">Loading…</div>
      ) : maxPosted === 0 && maxClaims === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 font-medium">
          No posts or claims to plot in this window.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <HeatmapSide
            title="Posted"
            subtitle="Tickets created"
            cells={cells}
            max={maxPosted}
            metric={(c) => c?.posted ?? 0}
            emptyBg="#fafafa"
            fillRgb="39, 39, 42"
            peakLabel="posts"
          />
          <HeatmapSide
            title="Claimed"
            subtitle="Claim events"
            cells={cells}
            max={maxClaims}
            metric={(c) => c?.claims ?? 0}
            emptyBg="#f8fafc"
            fillRgb="5, 150, 105"
            peakLabel="claims"
          />
        </div>
      )}
    </div>
  );
}

function HeatmapSide({
  title,
  subtitle,
  cells,
  max,
  metric,
  emptyBg,
  fillRgb,
  peakLabel,
}: {
  title: string;
  subtitle: string;
  cells: Map<string, HeatmapBucket>;
  max: number;
  metric: (c?: HeatmapBucket) => number;
  emptyBg: string;
  fillRgb: string;
  peakLabel: string;
}) {
  return (
    <div>
      <div className="mb-3">
        <p className="text-sm font-bold text-zinc-900">{title}</p>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
          {subtitle}
        </p>
      </div>
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
              <DowRow
                key={d}
                d={d}
                cells={cells}
                max={max}
                metric={metric}
                emptyBg={emptyBg}
                fillRgb={fillRgb}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
            <span>Less</span>
            <div className="flex gap-px">
              {[0.04, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <span
                  key={v}
                  className="w-4 h-3 rounded-sm"
                  style={{ background: `rgba(${fillRgb}, ${v})` }}
                  aria-hidden
                />
              ))}
            </div>
            <span>More</span>
            <span className="text-zinc-500">
              Peak: {max === 0 ? "—" : `${formatNumber(max)} ${peakLabel}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DowRow({
  d,
  cells,
  max,
  metric,
  emptyBg,
  fillRgb,
}: {
  d: number;
  cells: Map<string, HeatmapBucket>;
  max: number;
  metric: (c?: HeatmapBucket) => number;
  emptyBg: string;
  fillRgb: string;
}) {
  return (
    <>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pr-2 flex items-center bg-white">
        {DOW_LABELS[d]}
      </div>
      {Array.from({ length: 24 }, (_, h) => {
        const cell = cells.get(`${d}-${h}`);
        const n = metric(cell);
        const i = intensity(n, max);
        const posted = cell?.posted ?? 0;
        const claims = cell?.claims ?? 0;
        return (
          <div
            key={h}
            className="aspect-square min-h-[20px]"
            style={{
              background: n === 0 ? emptyBg : `rgba(${fillRgb}, ${i})`,
            }}
            title={`${DOW_LABELS[d]} ${h.toString().padStart(2, "0")}:00 — ${n} in this view · posted ${posted}, claims ${claims}`}
          />
        );
      })}
    </>
  );
}
