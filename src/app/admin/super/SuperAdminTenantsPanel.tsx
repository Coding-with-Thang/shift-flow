"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Trash2 } from "lucide-react";

type TenantRow = {
  id: string;
  name: string;
  tenantCode: string;
  createdAt: string;
};

export function SuperAdminTenantsPanel() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tenantCode, setTenantCode] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/tenants", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not load tenants");
      setTenants([]);
      return;
    }
    setTenants(data.tenants ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), tenantCode: tenantCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create tenant");
        return;
      }
      setName("");
      setTenantCode("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function onRemove(t: TenantRow) {
    const ok = window.confirm(
      `Delete tenant "${t.name}" (${t.tenantCode})? This removes all users and data for that tenant.`,
    );
    if (!ok) return;
    setError(null);
    setRemovingId(t.id);
    try {
      const res = await fetch(`/api/admin/tenants/${encodeURIComponent(t.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not remove tenant");
        return;
      }
      await load();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2 flex items-center gap-3">
          <Building2 className="w-9 h-9 text-zinc-400" strokeWidth={1.25} />
          Platform tenants
        </h1>
        <p className="text-zinc-500 font-medium text-lg">
          Create and remove organizations (tenants). Only super admins see this page.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="border border-[#E2E8F0] p-6 rounded-sm space-y-4 bg-white"
      >
        <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400">Add tenant</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-zinc-800">
            Organization name
            <input
              required
              className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Call Center"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Tenant code
            <input
              required
              className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none font-mono"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              placeholder="acme"
              autoComplete="off"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 bg-black text-white text-xs font-bold tracking-widest uppercase px-6 py-3 hover:bg-zinc-800 disabled:opacity-60"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Create tenant
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 font-medium" role="alert">
          {error}
        </p>
      ) : null}

      <div className="border border-[#E2E8F0] rounded-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-zinc-50 flex justify-between items-center">
          <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-500">All tenants</h2>
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : null}
        </div>
        {!loading && tenants.length === 0 ? (
          <p className="p-10 text-center text-zinc-400 text-sm font-medium">No tenants yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-zinc-50">
                  <td className="px-6 py-4 font-semibold text-zinc-900">{t.name}</td>
                  <td className="px-6 py-4 font-mono text-zinc-600">{t.tenantCode}</td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(t.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(t)}
                      disabled={removingId === t.id}
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Delete tenant"
                    >
                      {removingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
