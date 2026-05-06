import React from "react";
import { HourRequestsPanel } from "./HourRequestsPanel";

export default function HourRequestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
          Hour Requests
        </h1>
        <p className="text-zinc-500 font-medium text-lg max-w-2xl">
          Agent requests for additional hours awaiting your decision. Approve the
          request or decline with a note.
        </p>
      </div>
      <HourRequestsPanel />
    </div>
  );
}

