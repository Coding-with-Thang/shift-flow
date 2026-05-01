"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [tenantCode, setTenantCode] = useState("demo");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantCode, username, inviteCode, password }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register</h1>
        <p className="text-sm text-zinc-600">One-time setup with your invite code.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-zinc-800">
          Tenant code
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={tenantCode}
            onChange={(e) => setTenantCode(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Username
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          Invite code
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-zinc-800">
          New password
          <input
            type="password"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        Already set up?{" "}
        <Link className="text-zinc-900 underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
