"use client";

import { useCallback, useEffect, startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  role: string;
  publicAlias: string;
  tenant: { name: string; tenantCode: string };
};

type Ticket = {
  id: string;
  shiftDate: string;
  startSlot: number;
  endSlot: number;
  siteTeam: string | null;
  skillTag: string | null;
  status: string;
  requestorAlias: string;
  claimerAlias: string | null;
  tenantCode?: string;
  tenantName?: string;
};

type TenantOption = { id: string; name: string; tenantCode: string };

type AuditRow = {
  id: string;
  createdAt: string;
  tenantCode: string;
  tenantName: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUsername: string;
  actorAlias: string;
  actorRole: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<
    "marketplace" | "mine" | "approvals" | "analytics" | "activity"
  >("marketplace");
  const [market, setMarket] = useState<Ticket[]>([]);
  const [mine, setMine] = useState<Ticket[]>([]);
  const [approvals, setApprovals] = useState<Ticket[]>([]);
  const [analytics, setAnalytics] = useState<
    { day: string; ticketsCreated: number; claimsMade: number; approved: number; declined: number; cancelled: number; expired: number }[]
  >([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  /** Super admin: null = all tenants; otherwise tenant id */
  const [scopeTenantId, setScopeTenantId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startSlot, setStartSlot] = useState(32);
  const [endSlot, setEndSlot] = useState(36);
  const [siteTeam, setSiteTeam] = useState("");
  const [skillTag, setSkillTag] = useState("");

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/me", { credentials: "include" });
    if (res.status === 401) {
      setUser(null);
      return;
    }
    const data = await res.json();
    setUser(data.user);
  }, []);

  const tenantQuery = useCallback((role: string, tenantId: string | null) => {
    if (role !== "SUPER_ADMIN" || !tenantId) return "";
    return `&tenantId=${encodeURIComponent(tenantId)}`;
  }, []);

  const loadLists = useCallback(
    async (role: string, tenantId: string | null) => {
      const tq = tenantQuery(role, tenantId);
      const m = await fetch(`/api/tickets?view=marketplace${tq}`, { credentials: "include" }).then((r) =>
        r.json(),
      );
      const mi = await fetch(`/api/tickets?view=mine${tq}`, { credentials: "include" }).then((r) =>
        r.json(),
      );
      setMarket(m.tickets ?? []);
      setMine(mi.tickets ?? []);

      const canManage = ["LEADER", "OPS_MANAGER", "SUPER_ADMIN"].includes(role);
      if (canManage) {
        const ap = await fetch(`/api/tickets?view=approvals${tq}`, { credentials: "include" }).then((r) =>
          r.json(),
        );
        setApprovals(ap.tickets ?? []);
      } else {
        setApprovals([]);
      }
      if (canManage) {
        const analyticsUrl =
          role === "SUPER_ADMIN" && tenantId
            ? `/api/ops/analytics?tenantId=${encodeURIComponent(tenantId)}`
            : "/api/ops/analytics";
        const an = await fetch(analyticsUrl, { credentials: "include" }).then((r) =>
          r.ok ? r.json() : { rows: [] },
        );
        setAnalytics(an.rows ?? []);
      } else {
        setAnalytics([]);
      }
    },
    [tenantQuery],
  );

  const loadAudit = useCallback(
    async (tenantId: string | null) => {
      const base = "/api/admin/audit-events?take=100";
      const url =
        tenantId != null && tenantId !== ""
          ? `${base}&tenantId=${encodeURIComponent(tenantId)}`
          : base;
      const res = await fetch(url, { credentials: "include" });
      const data = res.ok ? await res.json() : { events: [] };
      setAuditEvents(data.events ?? []);
    },
    [],
  );

  useEffect(() => {
    startTransition(() => {
      void loadMe();
    });
  }, [loadMe]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    startTransition(() => {
      void fetch("/api/admin/tenants", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { tenants: [] }))
        .then((data: { tenants?: TenantOption[] }) => setTenants(data.tenants ?? []))
        .catch(() => setTenants([]));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    startTransition(() => {
      void loadLists(user.role, scopeTenantId);
    });
  }, [user, scopeTenantId, loadLists]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN" || tab !== "activity") return;
    startTransition(() => {
      void loadAudit(scopeTenantId);
    });
  }, [user, tab, scopeTenantId, loadAudit]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  async function claim(id: string) {
    setMsg(null);
    const res = await fetch(`/api/tickets/${id}/claim`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error ?? "Claim failed");
    else setMsg("Claimed — awaiting leader approval.");
    if (user) await loadLists(user.role, scopeTenantId);
  }

  async function cancel(id: string) {
    setMsg(null);
    const res = await fetch(`/api/tickets/${id}/cancel`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error ?? "Cancel failed");
    if (user) await loadLists(user.role, scopeTenantId);
  }

  async function decide(id: string, decision: "APPROVE" | "DECLINE") {
    setMsg(null);
    const res = await fetch(`/api/tickets/${id}/decision`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes: decision === "DECLINE" ? "Declined" : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error ?? "Decision failed");
    if (user) await loadLists(user.role, scopeTenantId);
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/tickets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftDate,
        startSlot,
        endSlot,
        siteTeam: siteTeam || undefined,
        skillTag: skillTag || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error ?? "Could not create ticket");
    else setMsg("Ticket created.");
    if (user) await loadLists(user.role, scopeTenantId);
  }

  if (user === undefined) {
    return <div className="p-8 text-sm text-zinc-600">Loading…</div>;
  }
  if (user === null) {
    return (
      <div className="p-8">
        <p className="text-sm">
          <Link className="underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  const showPost = user.role === "AGENT";
  const showApprovals = ["LEADER", "OPS_MANAGER", "SUPER_ADMIN"].includes(user.role);
  const showAnalytics = ["LEADER", "OPS_MANAGER", "SUPER_ADMIN"].includes(user.role);
  const showActivity = user.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="text-sm text-zinc-600">
            {user.tenant.name} · @{user.username} · {user.role} · {user.publicAlias}
          </p>
          {showActivity ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span className="font-medium text-zinc-700">Tenant scope</span>
                <select
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                  value={scopeTenantId ?? ""}
                  onChange={(e) => setScopeTenantId(e.target.value === "" ? null : e.target.value)}
                >
                  <option value="">All tenants</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tenantCode} — {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs text-zinc-500">
                Tickets, approvals, analytics, and activity respect this scope.
              </span>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => void logout()} className="text-sm underline">
          Sign out
        </button>
      </header>

      {msg ? <p className="mb-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">{msg}</p> : null}

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        <Tab active={tab === "marketplace"} onClick={() => setTab("marketplace")}>
          Marketplace
        </Tab>
        <Tab active={tab === "mine"} onClick={() => setTab("mine")}>
          My tickets
        </Tab>
        {showApprovals ? (
          <Tab active={tab === "approvals"} onClick={() => setTab("approvals")}>
            Approvals
          </Tab>
        ) : null}
        {showAnalytics ? (
          <Tab active={tab === "analytics"} onClick={() => setTab("analytics")}>
            Analytics
          </Tab>
        ) : null}
        {showActivity ? (
          <Tab active={tab === "activity"} onClick={() => setTab("activity")}>
            Activity
          </Tab>
        ) : null}
      </nav>

      {showPost ? (
        <section className="mb-10 rounded border border-zinc-200 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Post hours to give</h2>
          <form onSubmit={createTicket} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                Start slot (0–95)
                <input
                  type="number"
                  min={0}
                  max={95}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                  value={startSlot}
                  onChange={(e) => setStartSlot(Number(e.target.value))}
                />
              </label>
              <label className="text-sm">
                End slot (1–96, exclusive)
                <input
                  type="number"
                  min={1}
                  max={96}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                  value={endSlot}
                  onChange={(e) => setEndSlot(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="text-sm sm:col-span-2">
              Site / team (optional)
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                value={siteTeam}
                onChange={(e) => setSiteTeam(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Skill tag (optional)
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
                value={skillTag}
                onChange={(e) => setSkillTag(e.target.value)}
              />
            </label>
            <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white sm:col-span-2">
              Create ticket
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">96 slots = 15 minutes each (America/Winnipeg).</p>
        </section>
      ) : null}

      {tab === "marketplace" ? (
        <TicketList title="Open tickets" tickets={market} action={(t) => (
          <button type="button" className="text-sm underline" onClick={() => void claim(t.id)}>
            Claim
          </button>
        )} />
      ) : null}

      {tab === "mine" ? (
        <TicketList
          title="Posted by you"
          tickets={mine}
          action={(t) =>
            t.status === "PENDING" || t.status === "CLAIMED" ? (
              <button type="button" className="text-sm underline" onClick={() => void cancel(t.id)}>
                Cancel
              </button>
            ) : null
          }
        />
      ) : null}

      {tab === "approvals" && showApprovals ? (
        <TicketList
          title="Awaiting approval"
          tickets={approvals}
          action={(t) => (
            <div className="flex gap-2">
              <button type="button" className="text-sm underline" onClick={() => void decide(t.id, "APPROVE")}>
                Approve
              </button>
              <button type="button" className="text-sm text-red-700 underline" onClick={() => void decide(t.id, "DECLINE")}>
                Decline
              </button>
            </div>
          )}
        />
      ) : null}

      {tab === "analytics" && showAnalytics ? (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Claims</th>
                <th className="px-3 py-2">Approved</th>
                <th className="px-3 py-2">Declined</th>
                <th className="px-3 py-2">Cancelled</th>
                <th className="px-3 py-2">Expired</th>
              </tr>
            </thead>
            <tbody>
              {analytics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-zinc-500">
                    No rollup yet — run the daily analytics job after activity.
                  </td>
                </tr>
              ) : (
                analytics.map((r) => (
                  <tr key={r.day} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{r.day}</td>
                    <td className="px-3 py-2">{r.ticketsCreated}</td>
                    <td className="px-3 py-2">{r.claimsMade}</td>
                    <td className="px-3 py-2">{r.approved}</td>
                    <td className="px-3 py-2">{r.declined}</td>
                    <td className="px-3 py-2">{r.cancelled}</td>
                    <td className="px-3 py-2">{r.expired}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "activity" && showActivity ? (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Entity</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-zinc-500">
                    No audit events yet.
                  </td>
                </tr>
              ) : (
                auditEvents.map((e) => (
                  <tr key={e.id} className="border-t border-zinc-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-medium">{e.tenantCode}</span>
                      <div className="text-zinc-500">{e.tenantName}</div>
                    </td>
                    <td className="px-3 py-2">{e.action}</td>
                    <td className="px-3 py-2 text-xs">
                      @{e.actorUsername}
                      <div className="text-zinc-500">
                        {e.actorAlias} · {e.actorRole}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {e.entityType}:{e.entityId.slice(0, 8)}…
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Tab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 ${active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"}`}
    >
      {children}
    </button>
  );
}

function TicketList({
  title,
  tickets,
  action,
}: {
  title: string;
  tickets: Ticket[];
  action: (t: Ticket) => React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">{title}</h2>
      <ul className="flex flex-col gap-2">
        {tickets.length === 0 ? <li className="text-sm text-zinc-500">Nothing here.</li> : null}
        {tickets.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-200 px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{t.shiftDate}</span> · slots {t.startSlot}–{t.endSlot} · {t.status}
              <div className="text-xs text-zinc-600">
                {t.tenantCode ? (
                  <span className="mr-1 font-medium text-zinc-700">[{t.tenantCode}]</span>
                ) : null}
                From {t.requestorAlias}
                {t.claimerAlias ? ` → ${t.claimerAlias}` : ""}
                {t.siteTeam ? ` · ${t.siteTeam}` : ""}
                {t.skillTag ? ` · ${t.skillTag}` : ""}
              </div>
            </div>
            <div>{action(t)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
