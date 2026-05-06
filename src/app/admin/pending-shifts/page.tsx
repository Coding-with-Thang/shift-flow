import React from "react";
import { PendingShiftsPanel } from "./PendingShiftsPanel";
import { HourRequestsPanel } from "../hour-requests/HourRequestsPanel";

export default function PendingShiftsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
          Pending Approvals
        </h1>
        <p className="text-zinc-500 font-medium text-lg max-w-3xl">
          Review both claimed shift swaps and hour requests in one place.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-900">
            Claimed shift swaps
          </h2>
          <p className="text-zinc-500 font-medium">
            Approve the swap or decline with a standard reason, or choose{" "}
            <span className="text-zinc-800">Other</span> to enter a custom note.
          </p>
        </div>
        <PendingShiftsPanel />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-900">
            Hour requests
          </h2>
          <p className="text-zinc-500 font-medium">
            Agents requesting additional hours awaiting your decision. Approve
            the request or decline with a note.
          </p>
        </div>
        <HourRequestsPanel />
      </section>
    </div>
  );
}
