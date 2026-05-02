import React from "react";

export default function ShiftActivitiesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Shift Activities</h1>
        <p className="text-zinc-500 font-medium text-lg">Detailed history of all shift-related events.</p>
      </div>
      <div className="p-20 border border-dashed border-zinc-300 rounded-sm flex flex-col items-center justify-center text-zinc-400">
        <p className="font-bold tracking-widest uppercase text-xs">Activity log streaming...</p>
      </div>
    </div>
  );
}
