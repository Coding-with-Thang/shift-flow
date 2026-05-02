import React from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-white p-10">
          {children}
        </main>
        <footer className="h-16 px-8 flex items-center justify-between border-t border-[#E2E8F0] bg-white text-[10px] text-zinc-400 font-medium uppercase tracking-wider flex-shrink-0">
          <div className="w-full text-right pr-4">
            ©2026 SHIFTFLOW
          </div>
        </footer>
      </div>
    </div>
  );
}
