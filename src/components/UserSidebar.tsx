"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, ShieldCheck, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAgent } from "@/lib/rbac";

const menuItems = [
  { name: "Marketplace", icon: Store, href: "/marketplace" },
  { name: "Admin Portal", icon: ShieldCheck, href: "/admin" },
  { name: "My Activity", icon: History, href: "/my-activity" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export function UserSidebar() {
  const pathname = usePathname();
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [canShowMyActivity, setCanShowMyActivity] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && data?.user?.role) {
        const role = data.user.role;
        if (!isAgent(role)) {
          setShowAdminPortal(true);
        }
        setCanShowMyActivity(isAgent(role));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = menuItems
    .filter((item) => showAdminPortal || item.href !== "/admin")
    .filter((item) => canShowMyActivity || item.href !== "/my-activity");

  return (
    <aside className="w-[240px] shrink-0 border-r border-zinc-200 flex flex-col bg-[#FAFAFA] h-full">
      <div className="flex flex-col flex-1 min-h-0 pt-6 pb-8">
        <div className="flex flex-col items-center mb-8 mx-4">
          <div className="bg-black text-white font-bold tracking-widest px-4 py-1.5 text-xl w-full text-center">
            SHIFTFLOW
          </div>
          <div className="text-[9px] tracking-[0.2em] text-zinc-500 font-semibold uppercase mt-2">
            PROTOCOL V4.2.1
          </div>
        </div>

        <div className="text-xs text-zinc-500 mb-3 px-8">Menu</div>
        <nav className="flex flex-col">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-8 py-3 transition-colors border-l-4",
                  isActive
                    ? "bg-zinc-100 border-[#544DFB] text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-transparent hover:border-[#544DFB]",
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span
                  className={cn(
                    "text-sm",
                    isActive ? "font-bold" : "font-medium",
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
