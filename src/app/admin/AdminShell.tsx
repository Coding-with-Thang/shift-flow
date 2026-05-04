"use client";

import React, { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { PostShiftModal } from "@/components/PostShiftModal";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isPostModalOpen, setPostModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white text-zinc-900 font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader onPostShiftClick={() => setPostModalOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-white p-10">{children}</main>
        <footer className="min-h-14 px-8 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#E2E8F0] bg-white text-[10px] text-zinc-400 font-medium uppercase tracking-wider shrink-0">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>Version: {APP_VERSION}-stable</span>
          </div>
          <div className="text-left sm:text-right">© 2026 Shiftflow</div>
        </footer>
      </div>

      <PostShiftModal
        isOpen={isPostModalOpen}
        onClose={() => setPostModalOpen(false)}
      />
    </div>
  );
}
