import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Status line for cursor-style lists (loaded count, hints). */
export function AdminCursorListSummary({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 font-medium",
        className,
      )}
    >
      <span>{primary}</span>
      {secondary != null ? (
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">{secondary}</span>
      ) : null}
    </div>
  );
}

/** Bottom bar with a single “load more” action (cursor pages or append-by-page). */
export function AdminLoadMoreBar({
  visible,
  loading,
  onLoadMore,
  label = "Load more",
  loadingLabel = "Loading…",
}: {
  visible: boolean;
  loading: boolean;
  onLoadMore: () => void;
  label?: string;
  loadingLabel?: string;
}) {
  if (!visible) return null;
  return (
    <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 flex justify-center">
      <button
        type="button"
        disabled={loading}
        onClick={onLoadMore}
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-100 px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            {loadingLabel}
          </>
        ) : (
          label
        )}
      </button>
    </div>
  );
}
