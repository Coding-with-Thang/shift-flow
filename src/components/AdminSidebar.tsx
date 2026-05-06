"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Users,
  Activity,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Settings,
  HelpCircle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canViewAnalytics } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const baseMenuItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/admin" },
  { name: "Pending Shifts", icon: Clock, href: "/admin/pending-shifts" },
  { name: "Users", icon: Users, href: "/admin/users" },
  { name: "Shift Activities", icon: Activity, href: "/admin/shift-activities" },
] as const;

const analyticsMenuItem = {
  name: "Analytics",
  icon: BarChart3,
  href: "/admin/analytics",
} as const;

const tailMenuItems = [
  { name: "Audit Log", icon: ShieldCheck, href: "/admin/audit-log" },
  { name: "Settings", icon: Settings, href: "/admin/settings" },
] as const;

const superAdminMenuItem = {
  name: "Platform tenants",
  icon: Building2,
  href: "/admin/super",
} as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        user?: { role: Role } | null;
      };
      if (!cancelled) {
        setRole(data?.user?.role ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showSuperAdminNav = role === "SUPER_ADMIN";
  const showAnalytics = role !== null && canViewAnalytics(role);

  const items = [
    ...baseMenuItems,
    ...(showAnalytics ? [analyticsMenuItem] : []),
    ...tailMenuItems,
    ...(showSuperAdminNav ? [superAdminMenuItem] : []),
  ];

  return (
    <aside className="w-[220px] bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0 text-zinc-300">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-sm bg-white text-zinc-950 flex items-center justify-center text-xs font-black tracking-tighter">
            SF
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="text-[11px] font-bold text-white leading-tight tracking-wide uppercase">
              Admin Portal
            </h2>
          </div>
        </div>
      </div>

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
                    ? "bg-zinc-900 border border-zinc-700 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    isActive
                      ? "text-white"
                      : "text-zinc-500 group-hover:text-white",
                  )}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-zinc-800 space-y-1">
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors"
        >
          <HelpCircle className="w-5 h-5 text-zinc-500" />
          Support
        </Link>
      </div>
    </aside>
  );
}
