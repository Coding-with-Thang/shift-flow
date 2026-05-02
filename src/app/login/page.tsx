"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, Lock, Building2 } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [tenantCode, setTenantCode] = useState("demo");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantCode, username, password }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
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
      {/* Background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex justify-center items-center">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] border border-gray-200/50 bg-white/40 rotate-[15deg]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] border border-gray-200/50 bg-white/40 -rotate-[15deg]" />
      </div>

      <div className="z-10 flex flex-col items-center mb-8 mt-12">
        <div className="bg-black text-white font-bold tracking-[0.1em] px-4 py-1.5 text-xl mb-3">
          SHIFTFLOW
        </div>
        <div className="text-[10px] tracking-[0.2em] text-zinc-600 font-semibold uppercase">
          PROTOCOL V4.2.1
        </div>
      </div>

      <div className="bg-white border border-zinc-200 p-8 sm:p-10 w-[90%] max-w-[440px] z-10 shadow-sm relative mb-8">
        <h1 className="text-[28px] font-bold mb-2 tracking-tight">Login</h1>
        <p className="text-xs text-zinc-600 mb-8 font-medium">
          Enter your secure credentials to login.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-zinc-800 mb-2 uppercase">
              Tenant Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                className="block w-full pl-10 pr-3 py-3 bg-[#F0F0F0] border-0 text-sm focus:ring-1 focus:ring-black outline-none transition-shadow font-medium text-zinc-800"
                placeholder="Enter tenant code"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-zinc-800 mb-2 uppercase">
              Username / ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Cpu className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                className="block w-full pl-10 pr-3 py-3 bg-[#F0F0F0] border-0 text-sm focus:ring-1 focus:ring-black outline-none transition-shadow font-medium text-zinc-800"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold tracking-widest text-zinc-800 uppercase">
                Password
              </label>
              <Link
                href="#"
                className="text-[10px] font-bold text-zinc-900 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="password"
                className="block w-full pl-10 pr-3 py-3 bg-[#F0F0F0] border-0 text-sm focus:ring-1 focus:ring-black outline-none transition-shadow font-medium tracking-[0.2em] text-zinc-800"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <div className="z-10 flex flex-col gap-5 text-center mb-12">
        <p className="text-[11px] text-zinc-700 font-medium max-w-sm mx-auto leading-relaxed">
          Accounts are provisioned by your organization. Contact your administrator if you need
          access.
        </p>
        <div className="flex gap-6 justify-center text-[9px] text-zinc-500 uppercase tracking-[0.15em] font-semibold">
          <Link href="#" className="hover:text-black transition-colors">
            System Status
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Legal Terms
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Support
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
