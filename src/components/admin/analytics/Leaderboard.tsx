"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "./formatters";

export type LeaderboardEntry = {
  userId: string;
  alias: string;
  username: string;
  role: string;
  total: number;
  approved: number;
  declined: number;
};

type Role = "requestor" | "claimer" | "approver";

const ROLE_LABEL: Record<Role, { title: string; subtitle: string; totalLabel: string }> = {
  requestor: {
    title: "Top requestors",
    subtitle: "Agents who post the most shifts.",
    totalLabel: "Posted",
  },
  claimer: {
    title: "Top claimers",
    subtitle: "Agents who pick up the most shifts.",
    totalLabel: "Claimed",
  },
  approver: {
    title: "Top approvers",
    subtitle: "Leaders / ops with the most decisions.",
    totalLabel: "Decisions",
  },
};

type Props = {
  role: Role;
  entries: LeaderboardEntry[];
  loading?: boolean;
  className?: string;
};

export function Leaderboard({ role, entries, loading, className }: Props) {
  const meta = ROLE_LABEL[role];

  return (
    <div className={cn("border border-zinc-200 rounded-sm bg-white p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{meta.title}</h3>
        <p className="text-xs text-zinc-500 font-medium">{meta.subtitle}</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-zinc-400 font-medium">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-400 font-medium">
          No activity in this window.
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-200">
              <th className="px-2 py-2 w-8">#</th>
              <th className="px-2 py-2">User</th>
              <th className="px-2 py-2 text-right">{meta.totalLabel}</th>
              {role !== "requestor" ? (
                <>
                  <th className="px-2 py-2 text-right">Approved</th>
                  <th className="px-2 py-2 text-right">Declined</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.map((e, i) => (
              <tr key={e.userId}>
                <td className="px-2 py-2 text-zinc-400 font-mono text-xs">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="font-medium text-zinc-800">{e.alias}</div>
                  <div className="text-xs text-zinc-500">
                    @{e.username} · {e.role.toLowerCase()}
                  </div>
                </td>
                <td className="px-2 py-2 text-right tabular-nums font-bold text-zinc-900">
                  {formatNumber(e.total)}
                </td>
                {role !== "requestor" ? (
                  <>
                    <td className="px-2 py-2 text-right tabular-nums text-zinc-700">
                      {formatNumber(e.approved)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-zinc-700">
                      {formatNumber(e.declined)}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
