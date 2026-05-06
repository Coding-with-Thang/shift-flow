"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, HelpCircle, LogOut, Plus } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useShiftNotificationPanel } from "@/hooks/useShiftNotificationPanel";
import { isAgent } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  onPostShiftClick?: () => void;
}

type MeUser = {
  id: string;
  username: string;
  publicAlias: string | null;
  role: Role;
  tenant?: { tenantCode: string; name: string };
};

function displayNameFromUser(user: MeUser | null): string {
  if (!user) return "Account";
  const alias = user.publicAlias?.trim();
  return alias || user.username;
}

export function AdminHeader({ onPostShiftClick }: AdminHeaderProps) {
  const { hasNew } = useNotificationStore();
  const { openPanel, panelLayer } = useShiftNotificationPanel();
  const [canPostShift, setCanPostShift] = useState(false);
  const [meUser, setMeUser] = useState<MeUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { user?: MeUser | null };
      if (cancelled || !data.user) return;
      setMeUser(data.user);
      if (data.user.role && isAgent(data.user.role)) {
        setCanPostShift(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) closeMenu();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const label = displayNameFromUser(meUser);

  return (
    <>
      <header className="h-[72px] bg-white border-b border-[#E2E8F0] px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/marketplace" className="shrink-0">
            <span className="font-black text-xl tracking-tighter uppercase hover:opacity-80 transition-opacity">
              Shiftflow
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {onPostShiftClick && canPostShift ? (
            <button
              type="button"
              onClick={onPostShiftClick}
              className="bg-black text-white text-[10px] font-bold px-4 py-2 rounded-sm tracking-widest uppercase hover:bg-zinc-800 transition-all hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Shift</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={openPanel}
            className="relative text-zinc-900 group p-2 hover:bg-zinc-50 rounded-full transition-colors"
            aria-label="View Notifications"
          >
            <Bell
              className={`w-5 h-5 transition-transform duration-300 ${hasNew ? "group-hover:scale-110" : ""}`}
            />
            {hasNew && (
              <>
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border border-white z-10"></span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full animate-ping opacity-75"></span>
              </>
            )}
          </button>
          <button
            type="button"
            className="text-zinc-900 group p-2 hover:bg-zinc-50 rounded-full transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5 group-hover:text-black transition-colors" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="admin-header-user-menu-button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="admin-header-user-menu"
              aria-label={`Account menu (${label})`}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 max-w-[220px] pl-3 pr-2 py-2 rounded-sm border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
            >
              <span className="text-sm font-semibold tracking-tight truncate">
                {label}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200",
                  menuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {menuOpen ? (
              <div
                id="admin-header-user-menu"
                role="menu"
                aria-labelledby="admin-header-user-menu-button"
                className="absolute right-0 top-full mt-1.5 min-w-[200px] rounded-sm border border-zinc-200 bg-white py-1 shadow-lg z-50"
              >
                <LogoutButton
                  icon={LogOut}
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-black transition-colors disabled:opacity-60"
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {panelLayer}
    </>
  );
}
