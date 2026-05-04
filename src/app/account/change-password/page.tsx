"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forcedByPolicy, setForcedByPolicy] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && res.ok && data?.user) {
        setForcedByPolicy(Boolean(data.user.mustChangePassword));
      } else if (!cancelled) {
        setForcedByPolicy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update password");
        return;
      }
      router.push("/marketplace");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-zinc-900 flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex justify-center items-center">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] border border-gray-200/50 bg-white/40 rotate-15" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] border border-gray-200/50 bg-white/40 rotate-15" />
      </div>

      <div className="z-10 flex flex-col items-center mb-8 mt-12">
        <div className="bg-black text-white font-bold tracking-widest px-4 py-1.5 text-xl mb-3">
          SHIFTFLOW
        </div>
        <div className="text-[10px] tracking-[0.2em] text-zinc-600 font-semibold uppercase">
          PROTOCOL V4.2.1
        </div>
      </div>

      <div className="bg-white border border-zinc-200 p-8 sm:p-10 w-[90%] max-w-[440px] z-10 shadow-sm relative mb-8">
        <h1 className="text-[28px] font-bold mb-2 tracking-tight">
          {forcedByPolicy === true ? "Set a new password" : "Change password"}
        </h1>
        <p className="text-xs text-zinc-600 mb-8 font-medium leading-relaxed">
          {forcedByPolicy === true ? (
            <>
              Your administrator issued a temporary password. Choose a new
              password you have not used elsewhere to continue.
            </>
          ) : (
            <>
              Enter your current password and choose a new one (at least 8
              characters). Use a password you do not reuse on other sites.
            </>
          )}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-zinc-800 mb-2 uppercase">
              Current password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="password"
                className="block w-full pl-10 pr-3 py-3 bg-[#F0F0F0] border-0 text-sm focus:ring-1 focus:ring-black outline-none transition-shadow font-medium text-zinc-800"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-zinc-800 mb-2 uppercase">
              New password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="password"
                className="block w-full pl-10 pr-3 py-3 bg-[#F0F0F0] border-0 text-sm focus:ring-1 focus:ring-black outline-none transition-shadow font-medium text-zinc-800"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-zinc-800 mb-2 uppercase">
              Confirm new password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="password"
                className="block w-full pl-10 pr-3 py-3 bg-[#F0F0F0] border-0 text-sm focus:ring-1 focus:ring-black outline-none transition-shadow font-medium text-zinc-800"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold tracking-[0.15em] py-4 mt-2 text-xs uppercase hover:bg-zinc-800 transition-colors disabled:opacity-70"
          >
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>

        <p className="text-[11px] text-zinc-500 mt-6 text-center">
          <Link
            href="/marketplace"
            className="font-semibold text-zinc-800 hover:underline"
          >
            Cancel
          </Link>
        </p>
      </div>

      <Footer />
    </div>
  );
}
