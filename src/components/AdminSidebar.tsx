"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Users,
  Activity,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/admin" },
  { name: "Pending Shifts", icon: Clock, href: "/admin/pending-shifts" },
  { name: "Users", icon: Users, href: "/admin/users" },
  { name: "Shift Activities", icon: Activity, href: "/admin/shift-activities" },
  { name: "Audit Log", icon: ShieldCheck, href: "/admin/audit-log" },
  { name: "Settings", icon: Settings, href: "/admin/settings" },
];

const superAdminMenuItem = {
  name: "Platform tenants",
  icon: Building2,
  href: "/admin/super",
} as const;

const bottomItems = [
  { name: "Logout", icon: LogOut, href: "/logout" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [showSuperAdminNav, setShowSuperAdminNav] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && data?.user?.role === "SUPER_ADMIN") {
        setShowSuperAdminNav(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = showSuperAdminNav ? [...menuItems, superAdminMenuItem] : menuItems;

  return (
    <aside className="w-[200px] bg-[#F8FAFC] border-r border-[#E2E8F0] flex flex-col h-screen sticky top-0">
      {/* Profile Section */}
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">Admin Portal</h2>
            <p className="text-[12px] text-zinc-500 font-medium">Global Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6">
        <div className="px-3 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-sm transition-colors group",
                  isActive
                    ? "bg-white border border-[#E2E8F0] shadow-sm text-black"
                    : "text-zinc-500 hover:text-black hover:bg-zinc-100"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-black" : "text-zinc-400 group-hover:text-black")} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Menu */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-3 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-sm transition-colors group"
          >
            <item.icon className="w-5 h-5 text-zinc-400 group-hover:text-black" />
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
