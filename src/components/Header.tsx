"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, ChevronDown, LogOut, Plus } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useShiftNotificationPanel } from "@/hooks/useShiftNotificationPanel";
import { cn } from "@/lib/utils";
import { isAgent } from "@/lib/rbac";
import type { Role } from "@prisma/client";

interface HeaderProps {
  title: string;
  onPostShiftClick?: () => void;
  /** Rendered after the page title (e.g. help icon, tooltip trigger). */
  titleAside?: ReactNode;
}

type MeUser = {
  username: string;
  publicAlias: string | null;
  role: Role;
};

function displayNameFromUser(user: MeUser | null): string {
  if (!user) return "Account";
  const alias = user.publicAlias?.trim();
  return alias || user.username;
}

export function Header({ title, onPostShiftClick, titleAside }: HeaderProps) {
  const { hasNew } = useNotificationStore();
  const { openPanel, panelLayer } = useShiftNotificationPanel();

  const [meUser, setMeUser] = useState<MeUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { user?: MeUser | null };
      if (!cancelled && data.user) setMeUser(data.user);
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
      <header className="h-[72px] bg-white border-b border-zinc-200 px-8 flex items-center justify-between shrink-0 z-30 relative">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight shrink-0">{title}</h1>
          {titleAside ? <div className="min-w-0 flex items-center">{titleAside}</div> : null}
        </div>
        <div className="flex items-center gap-6">
          <button
            className="relative text-zinc-900 group p-2 hover:bg-zinc-50 rounded-full transition-colors"
            type="button"
            onClick={openPanel}
            aria-label="View Notifications"
          >
            <Bell className={`w-5 h-5 transition-transform duration-300 ${hasNew ? "group-hover:scale-110" : ""}`} />
            {hasNew && (
              <>
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border border-white z-10"></span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full animate-ping opacity-75"></span>
              </>
            )}
          </button>
          {onPostShiftClick && meUser && isAgent(meUser.role) ? (
            <button
              type="button"
              onClick={onPostShiftClick}
              className="bg-black text-white text-xs font-bold px-4 py-2 rounded-sm tracking-wider flex items-center gap-2 hover:bg-zinc-800 transition-all hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Post Shift</span>
            </button>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="header-user-menu-button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="header-user-menu"
              aria-label={`Account menu (${label})`}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 max-w-[220px] pl-3 pr-2 py-2 rounded-sm border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
            >
              <span className="text-sm font-semibold tracking-tight truncate">{label}</span>
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
                id="header-user-menu"
                role="menu"
                aria-labelledby="header-user-menu-button"
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
