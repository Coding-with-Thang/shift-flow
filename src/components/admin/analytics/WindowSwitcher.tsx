"use client";

import { ANALYTICS_WINDOWS, type AnalyticsWindow } from "@/lib/analytics/window";
import { cn } from "@/lib/utils";

type Props = {
  value: AnalyticsWindow;
  onChange: (next: AnalyticsWindow) => void;
  disabled?: boolean;
};

export function WindowSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Analytics window"
      className="inline-flex border border-zinc-200 rounded-sm overflow-hidden bg-white"
    >
      {ANALYTICS_WINDOWS.map((w) => {
        const active = w === value;
        return (
          <button
            key={w}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(w)}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-zinc-200 last:border-r-0 transition-colors disabled:opacity-50",
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {w}d
          </button>
        );
      })}
    </div>
  );
}
