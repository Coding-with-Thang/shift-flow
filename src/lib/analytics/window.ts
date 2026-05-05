import { addDays, startOfDay, startOfYear, subDays } from "date-fns";

export const ANALYTICS_WINDOWS = [7, 30, 90, "ytd"] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

/**
 * Parse a `window` query param: `7` | `30` | `90` | `ytd` (case-insensitive), default 30.
 */
export function parseWindow(raw: string | null | undefined): AnalyticsWindow {
  if (raw && raw.toLowerCase() === "ytd") return "ytd";
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

/** Short label for controls and KPI subtitles (e.g. "30d", "YTD"). */
export function formatAnalyticsWindowLabel(w: AnalyticsWindow): string {
  if (w === "ytd") return "YTD";
  return `${w}d`;
}

/**
 * Half-open day range: `[start, end)`.
 * - Rolling windows: last N calendar days including today (local).
 * - YTD: Jan 1 (local start of year) through end of today (exclusive end = tomorrow 00:00 local).
 */
export function getWindowRange(
  window: AnalyticsWindow,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const todayStart = startOfDay(now);
  if (window === "ytd") {
    return {
      start: startOfYear(todayStart),
      end: addDays(todayStart, 1),
    };
  }
  const start = subDays(todayStart, window - 1);
  const end = addDays(todayStart, 1);
  return { start, end };
}

/** YYYY-MM-DD (UTC) for cross-tenant aggregation keys. */
export function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build a sequence of YYYY-MM-DD day keys from `start` (inclusive) to `end` (exclusive),
 * stepping by one day in UTC. Use to gap-fill sparse daily series with zeros.
 */
export function dayKeysInRange(start: Date, end: Date): string[] {
  const out: string[] = [];
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (let t = startUtc; t < endUtc; t += 24 * 60 * 60 * 1000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
