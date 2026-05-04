"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  /** When set, render as a row like sidebar links */
  variant?: "sidebar" | "sidebar-dark";
  icon?: LucideIcon;
  label?: string;
};

export function LogoutButton({
  className,
  variant,
  icon: Icon,
  label = "Log out",
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (variant === "sidebar" || variant === "sidebar-dark") {
    const dark = variant === "sidebar-dark";
    return (
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loading}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-3 rounded-sm transition-colors group text-left",
          dark
            ? "text-zinc-400 hover:text-white hover:bg-zinc-900/80"
            : "text-zinc-500 hover:text-black hover:bg-zinc-100",
          className,
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              "w-5 h-5",
              dark ? "text-zinc-500 group-hover:text-white" : "text-zinc-400 group-hover:text-black",
            )}
          />
        ) : null}
        <span className="text-sm font-medium">{loading ? "Signing out…" : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={loading}
      className={className}
    >
      {Icon ? (
        <span className="flex w-full items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span>{loading ? "Signing out…" : label}</span>
        </span>
      ) : loading ? (
        "Signing out…"
      ) : (
        label
      )}
    </button>
  );
}
