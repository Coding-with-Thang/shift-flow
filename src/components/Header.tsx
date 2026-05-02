"use client";

import { Bell, UserCircle } from "lucide-react";

interface HeaderProps {
  title: string;
  onNotificationClick?: () => void;
}

export function Header({ title, onNotificationClick }: HeaderProps) {
  return (
    <header className="h-[72px] bg-white border-b border-zinc-200 px-8 flex items-center justify-between flex-shrink-0 z-30 relative">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-6">
        <button
          className="relative text-zinc-900"
          onClick={onNotificationClick}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-zinc-900 rounded-full border border-white"></span>
        </button>
        <button className="bg-black text-white text-xs font-bold px-4 py-2 rounded-sm tracking-wider">
          Post Shift
        </button>
        <button className="text-zinc-900">
          <UserCircle className="w-8 h-8 stroke-1" />
        </button>
      </div>
    </header>
  );
}
