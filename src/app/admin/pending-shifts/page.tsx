import React from "react";

export default function PendingShiftsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Pending Shifts</h1>
        <p className="text-zinc-500 font-medium text-lg">Manage and approve shift swap requests.</p>
      </div>
      <div className="p-20 border border-dashed border-zinc-300 rounded-sm flex flex-col items-center justify-center text-zinc-400">
        <p className="font-bold tracking-widest uppercase text-xs">No pending shifts at this time</p>
      </div>
    </div>
  );
}
