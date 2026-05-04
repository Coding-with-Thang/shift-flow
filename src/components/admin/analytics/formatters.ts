/** Compact number with thin separators, e.g. 1,234. */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Formats a 0..1 ratio as a percentage with one decimal, or "—" if null. */
export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Human-friendly duration from milliseconds: "—" / "12s" / "4m 30s" / "1h 12m" / "2d 3h". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const totalHr = totalMin / 60;
  if (totalHr < 24) {
    const h = Math.floor(totalHr);
    const m = Math.round((totalHr - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const totalDay = totalHr / 24;
  const d = Math.floor(totalDay);
  const h = Math.round((totalDay - d) * 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/** Day key (YYYY-MM-DD) → short label like "Apr 12". */
export function formatDayShort(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
