"use client";

import React from "react";
import Link from "next/link";
import { Bell, HelpCircle } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-[72px] bg-white border-b border-[#E2E8F0] px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <Link href="/">
          <span className="font-black text-xl tracking-tighter uppercase">
            Shiftflow
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-zinc-900 hover:text-zinc-600 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-zinc-900 hover:text-zinc-600 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-black flex items-center justify-center text-white text-sm font-bold rounded-sm">
          A
        </div>
      </div>
    </header>
  );
}
