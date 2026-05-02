import React from "react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">System Settings</h1>
        <p className="text-zinc-500 font-medium text-lg">Configure global parameters and rule thresholds.</p>
      </div>
      <div className="p-20 border border-dashed border-zinc-300 rounded-sm flex flex-col items-center justify-center text-zinc-400">
        <p className="font-bold tracking-widest uppercase text-xs">Settings module initialized</p>
      </div>
    </div>
  );
}
