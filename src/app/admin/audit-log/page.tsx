"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { AuditAction } from "@prisma/client";
import { canViewAnalytics, isSuperAdmin } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import {
  AdminTableRoot,
  AdminTableScroll,
  AdminTableTable,
  AdminTableThead,
  AdminTableHeaderRow,
  AdminTableHeaderCell,
  AdminTableBody,
  AdminTableRow,
  AdminTableEmptyCard,
} from "@/components/admin/AdminTable";
import { AdminCursorListSummary, AdminLoadMoreBar } from "@/components/admin/AdminListPagination";

type SortDir = "desc" | "asc";

type AuditFilters = {
  action: string;
  entityType: string;
  entityId: string;
  actorUsername: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: AuditFilters = {
  action: "",
  entityType: "",
  entityId: "",
  actorUsername: "",
  from: "",
  to: "",
};

const AUDIT_ACTION_VALUES = Object.values(AuditAction) as string[];

const ENTITY_TYPE_SUGGESTIONS = ["ShiftTicket", "User"];

type AuditEventRow = {
  id: string;
  createdAt: string;
  tenantCode: string;
  tenantName: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUsername: string;
  actorAlias: string | null;
  actorRole: Role;
  payload: unknown | null;
};

type TenantOption = { id: string; name: string; tenantCode: string };

type ListResponse = {
  events?: AuditEventRow[];
  nextCursor?: string | null;
  hasMore?: boolean;
  take?: number;
  sort?: SortDir;
  error?: string;
};

function formatAuditAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function roleLabel(role: Role): string {
  switch (role) {
    case "AGENT":
      return "Agent";
    case "LEADER":
      return "Leader";
    case "OPS_MANAGER":
      return "Operations";
    case "SUPER_ADMIN":
      return "Admin";
    default:
      return role;
  }
}

function toStartOfDayIso(dateStr: string): string | null {
  const t = dateStr.trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return `${t}T00:00:00.000Z`;
}

function toEndOfDayIso(dateStr: string): string | null {
  const t = dateStr.trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return `${t}T23:59:59.999Z`;
}

function buildListQuery(params: {
  take: number;
  sort: SortDir;
  tenantId: string;
  cursor: string | null;
  filters: AuditFilters;
}): string {
  const q = new URLSearchParams();
  q.set("take", String(params.take));
  q.set("sort", params.sort);
  q.set("includePayload", "0");
  if (params.tenantId.trim()) q.set("tenantId", params.tenantId.trim());
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.filters.action.trim()) q.set("action", params.filters.action.trim());
  if (params.filters.entityType.trim()) q.set("entityType", params.filters.entityType.trim());
  if (params.filters.entityId.trim()) q.set("entityId", params.filters.entityId.trim());
  if (params.filters.actorUsername.trim()) q.set("actorUsername", params.filters.actorUsername.trim());
  const after = toStartOfDayIso(params.filters.from);
  const before = toEndOfDayIso(params.filters.to);
  if (after) q.set("createdAfter", after);
  if (before) q.set("createdBefore", before);
  return q.toString();
}

export default function AuditLogPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantFilterId, setTenantFilterId] = useState("");

  const [draftFilters, setDraftFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortDir>("desc");
  const [take, setTake] = useState(50);

  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payloadById, setPayloadById] = useState<Record<string, unknown>>({});
  const [payloadLoadingId, setPayloadLoadingId] = useState<string | null>(null);
  const [payloadErrorById, setPayloadErrorById] = useState<Record<string, string>>({});

  const appliedKey = useMemo(
    () => JSON.stringify({ appliedFilters, sort, take, tenantFilterId }),
    [appliedFilters, sort, take, tenantFilterId],
  );

  const showTenantScope = Boolean(role && isSuperAdmin(role));
  const canView = Boolean(role && canViewAnalytics(role));

  const tenantQueryParam = showTenantScope ? tenantFilterId : "";

  const parseList = useCallback(async (res: Response): Promise<ListResponse> => {
    const body = (await res.json().catch(() => ({}))) as ListResponse;
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error("You do not have permission to view the audit log.");
      }
      throw new Error(typeof body.error === "string" ? body.error : `Failed to load (${res.status})`);
    }
    return body;
  }, []);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNextCursor(null);
    setHasMore(false);
    try {
      const qs = buildListQuery({
        take,
        sort,
        tenantId: tenantQueryParam,
        cursor: null,
        filters: appliedFilters,
      });
      const res = await fetch(`/api/admin/audit-events?${qs}`, { credentials: "include" });
      const body = await parseList(res);
      setEvents(body.events ?? []);
      setNextCursor(body.nextCursor ?? null);
      setHasMore(Boolean(body.hasMore));
    } catch (e) {
      setEvents([]);
      setNextCursor(null);
      setHasMore(false);
      setError(e instanceof Error ? e.message : "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, parseList, sort, take, tenantQueryParam]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const qs = buildListQuery({
        take,
        sort,
        tenantId: tenantQueryParam,
        cursor: nextCursor,
        filters: appliedFilters,
      });
      const res = await fetch(`/api/admin/audit-events?${qs}`, { credentials: "include" });
      const body = await parseList(res);
      const next = body.events ?? [];
      setEvents((prev) => [...prev, ...next]);
      setNextCursor(body.nextCursor ?? null);
      setHasMore(Boolean(body.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [appliedFilters, loadingMore, nextCursor, parseList, sort, take, tenantQueryParam]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        if (!meRes.ok) {
          if (!cancelled) {
            setError("Could not load session.");
            setLoading(false);
            setSessionReady(true);
          }
          return;
        }
        const meData = (await meRes.json()) as { user?: { role: Role } | null };
        const r = meData.user?.role ?? null;
        if (!cancelled) setRole(r);

        if (!r || !canViewAnalytics(r)) {
          if (!cancelled) {
            setLoading(false);
            setEvents([]);
            setSessionReady(true);
          }
          return;
        }

        if (isSuperAdmin(r)) {
          const tenantsRes = await fetch("/api/admin/tenants", { credentials: "include" });
          if (tenantsRes.ok) {
            const tData = (await tenantsRes.json()) as { tenants?: TenantOption[] };
            if (!cancelled) setTenants(tData.tenants ?? []);
          }
        }

        if (!cancelled) setSessionReady(true);
      } catch {
        if (!cancelled) {
          setError("Could not load session.");
          setLoading(false);
          setSessionReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !role || !canViewAnalytics(role)) return;
    void loadFirst();
  }, [sessionReady, role, appliedKey, loadFirst]);

  const applyDraftFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  const ensurePayload = useCallback(
    async (id: string) => {
      if (payloadById[id] !== undefined) return;
      setPayloadLoadingId(id);
      setPayloadErrorById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        const tidQ =
          showTenantScope && tenantFilterId.trim()
            ? `?tenantId=${encodeURIComponent(tenantFilterId.trim())}`
            : "";
        const res = await fetch(`/api/admin/audit-events/${encodeURIComponent(id)}${tidQ}`, {
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          event?: { payload: unknown };
        };
        if (!res.ok) {
          throw new Error(typeof body.error === "string" ? body.error : `Failed (${res.status})`);
        }
        if (!("event" in body) || body.event === undefined) {
          throw new Error("Invalid response");
        }
        setPayloadById((prev) => ({ ...prev, [id]: body.event!.payload }));
      } catch (e) {
        setPayloadErrorById((prev) => ({
          ...prev,
          [id]: e instanceof Error ? e.message : "Could not load payload",
        }));
      } finally {
        setPayloadLoadingId((cur) => (cur === id ? null : cur));
      }
    },
    [payloadById, showTenantScope, tenantFilterId],
  );

  return (
    <div className="space-y-8 max-w-[1600px]">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Audit Log</h1>
        <p className="text-zinc-500 font-medium text-lg max-w-2xl">
          {!sessionReady ? (
            <>Security and configuration events for compliance and operations follow-up.</>
          ) : showTenantScope ? (
            <>
              Cross-tenant audit trail for platform administrators: logins, tickets, user provisioning, and password
              resets. Large tenants stay fast with server filters, sort, and paginated loading.
            </>
          ) : canView ? (
            <>
              Audit trail for your organization: logins, shift tickets, user provisioning, and password resets. Use
              filters to narrow results; payloads load on demand.
            </>
          ) : (
            <>Security and configuration audit trail (restricted by role).</>
          )}
        </p>
      </div>

      {!sessionReady ? (
        <div className="flex items-center justify-center gap-3 py-20 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      ) : !canView ? (
        <div className="p-12 border border-zinc-200 rounded-sm bg-zinc-50 text-center max-w-xl">
          <p className="text-sm font-medium text-zinc-800">Audit log is restricted.</p>
          <p className="mt-2 text-sm text-zinc-500">
            This page is available to leaders, operations managers, and platform administrators. Contact your admin if
            you need a compliance export.
          </p>
        </div>
      ) : (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            {showTenantScope ? (
              <div>
                <label
                  htmlFor="audit-tenant-filter"
                  className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5"
                >
                  Tenant scope
                </label>
                <select
                  id="audit-tenant-filter"
                  value={tenantFilterId}
                  onChange={(e) => setTenantFilterId(e.target.value)}
                  className="text-sm font-medium border border-zinc-200 rounded-sm px-3 py-2 bg-white text-zinc-900 min-w-[220px] hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="">All tenants</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tenantCode} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 font-medium">Showing events for your organization only.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadFirst()}
                disabled={loading}
                className="text-[10px] font-bold uppercase tracking-widest border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-sm bg-zinc-50/50 p-5 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Filters</h2>
              <p className="text-xs text-zinc-500 max-w-xl">
                Date range uses each day in UTC (00:00–23:59). Narrow with action or entity filters before loading more
                pages — the list always loads at most {take} rows per request.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Action</span>
                <select
                  value={draftFilters.action}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, action: e.target.value }))}
                  className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900"
                >
                  <option value="">Any</option>
                  {AUDIT_ACTION_VALUES.map((a) => (
                    <option key={a} value={a}>
                      {formatAuditAction(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Entity type</span>
                <input
                  type="text"
                  value={draftFilters.entityType}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, entityType: e.target.value }))}
                  list="audit-entity-type-suggestions"
                  placeholder="e.g. ShiftTicket"
                  className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900"
                />
                <datalist id="audit-entity-type-suggestions">
                  {ENTITY_TYPE_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Entity id</span>
                <input
                  type="text"
                  value={draftFilters.entityId}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, entityId: e.target.value }))}
                  placeholder="Full id or prefix"
                  className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900 font-mono"
                />
              </label>
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actor username</span>
                <input
                  type="text"
                  value={draftFilters.actorUsername}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, actorUsername: e.target.value }))}
                  placeholder="Contains…"
                  className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">From (UTC day)</span>
                <input
                  type="date"
                  value={draftFilters.from}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))}
                  className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">To (UTC day)</span>
                <input
                  type="date"
                  value={draftFilters.to}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))}
                  className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900"
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-4 items-end">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value === "asc" ? "asc" : "desc")}
                    className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900 min-w-[160px]"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Page size</span>
                  <select
                    value={take}
                    onChange={(e) => setTake(Number(e.target.value))}
                    className="text-sm border border-zinc-200 rounded-sm px-2 py-2 bg-white text-zinc-900"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyDraftFilters}
                  className="text-[10px] font-bold uppercase tracking-widest bg-black text-white hover:bg-zinc-800 px-4 py-2 rounded-sm transition-colors"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] font-bold uppercase tracking-widest border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-2 rounded-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          {!error && loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              <span className="text-sm font-medium">Loading audit events…</span>
            </div>
          ) : !loading && events.length === 0 ? (
            <AdminTableEmptyCard
              title="No audit events in this scope"
              description="Try widening the date range or clearing filters."
            />
          ) : !loading ? (
            <div className="space-y-3">
              <AdminCursorListSummary
                primary={
                  <>
                    Showing {events.length} loaded row{events.length === 1 ? "" : "s"}
                    {hasMore ? " — more available" : " — end of current result set"}.
                  </>
                }
                secondary="Payloads load when you expand a row (reduces bandwidth at scale)."
              />
              <AdminTableRoot>
                <AdminTableScroll mode="y">
                  <AdminTableTable className="min-w-[900px]">
                    <AdminTableThead sticky>
                      <AdminTableHeaderRow variant="sticky">
                        <AdminTableHeaderCell className="whitespace-nowrap">When</AdminTableHeaderCell>
                        {showTenantScope ? (
                          <AdminTableHeaderCell className="whitespace-nowrap">Tenant</AdminTableHeaderCell>
                        ) : null}
                        <AdminTableHeaderCell className="whitespace-nowrap">Action</AdminTableHeaderCell>
                        <AdminTableHeaderCell className="whitespace-nowrap">Entity</AdminTableHeaderCell>
                        <AdminTableHeaderCell className="whitespace-nowrap">Actor</AdminTableHeaderCell>
                        <AdminTableHeaderCell className="min-w-[200px]">Payload</AdminTableHeaderCell>
                      </AdminTableHeaderRow>
                    </AdminTableThead>
                    <AdminTableBody>
                      {events.map((row) => (
                        <AdminTableRow key={row.id}>
                          <td className="px-4 py-3 text-zinc-700 whitespace-nowrap font-medium">
                            {format(parseISO(row.createdAt), "MMM d, yyyy HH:mm:ss")}
                          </td>
                          {showTenantScope ? (
                            <td className="px-4 py-3 text-zinc-800">
                              <span className="font-semibold text-xs uppercase tracking-wide text-zinc-600">
                                {row.tenantCode}
                              </span>
                              <span className="block text-zinc-500 text-xs font-normal mt-0.5">{row.tenantName}</span>
                            </td>
                          ) : null}
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-700 border border-zinc-200 bg-white px-2 py-1 rounded-sm whitespace-nowrap">
                              {formatAuditAction(row.action)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-800">
                            <span className="text-xs font-medium">{row.entityType}</span>
                            <code
                              className="block text-[11px] text-zinc-500 font-mono mt-0.5 truncate max-w-[160px]"
                              title={row.entityId}
                            >
                              {row.entityId}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-zinc-800">
                            <span className="font-medium">{row.actorAlias?.trim() || row.actorUsername}</span>
                            <span className="text-zinc-500 text-xs block font-normal">@{row.actorUsername}</span>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                              {roleLabel(row.actorRole)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <details
                              className="group"
                              onToggle={(e) => {
                                const el = e.currentTarget;
                                if (el.open) void ensurePayload(row.id);
                              }}
                            >
                              <summary className="text-xs font-medium text-zinc-600 cursor-pointer list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                                <span className="border-b border-dotted border-zinc-400 group-open:border-transparent">
                                  View JSON
                                </span>
                                {payloadLoadingId === row.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" aria-hidden />
                                ) : null}
                              </summary>
                              {payloadErrorById[row.id] ? (
                                <p className="mt-2 text-xs text-red-600">{payloadErrorById[row.id]}</p>
                              ) : (
                                <pre className="mt-2 text-[10px] leading-relaxed text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-sm p-2 max-h-40 overflow-auto font-mono whitespace-pre-wrap break-all">
                                  {payloadById[row.id] !== undefined
                                    ? JSON.stringify(payloadById[row.id], null, 2)
                                    : payloadLoadingId === row.id
                                      ? "…"
                                      : "(closed)"}
                                </pre>
                              )}
                            </details>
                          </td>
                        </AdminTableRow>
                      ))}
                    </AdminTableBody>
                  </AdminTableTable>
                </AdminTableScroll>
                <AdminLoadMoreBar
                  visible={hasMore}
                  loading={loadingMore}
                  onLoadMore={() => void loadMore()}
                />
              </AdminTableRoot>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
