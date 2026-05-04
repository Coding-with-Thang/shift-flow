import { addDays, startOfDay, subDays } from "date-fns";

export const ANALYTICS_WINDOWS = [7, 30, 90] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

/** Parse a `window` query-string value to one of 7 / 30 / 90, defaulting to 30. */
export function parseWindow(raw: string | null | undefined): AnalyticsWindow {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

/**
 * Half-open day range covering the last `window` days INCLUDING today.
 * `start` is the local start-of-day for the first day; `end` is exclusive
 * (the start of tomorrow). Suitable for `createdAt: { gte: start, lt: end }`.
 */
export function getWindowRange(
  window: AnalyticsWindow,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const todayStart = startOfDay(now);
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
