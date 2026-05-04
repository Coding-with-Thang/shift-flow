import React from "react";
import { PendingShiftsPanel } from "./PendingShiftsPanel";

export default function PendingShiftsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Pending Shifts</h1>
        <p className="text-zinc-500 font-medium text-lg max-w-2xl">
          Claimed agent shift swaps awaiting your decision. Approve the swap or decline with a standard reason, or
          choose <span className="text-zinc-800">Other</span> to enter a custom note.
        </p>
      </div>
      <PendingShiftsPanel />
    </div>
  );
}
