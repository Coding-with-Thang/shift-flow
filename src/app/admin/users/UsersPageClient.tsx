"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  canAssignRole,
  canProvisionUsers,
  canDeleteUser,
  canEditAgentAlias,
  canEditLeaderAlias,
  canEditOwnAlias,
  canResetUserPassword,
} from "@/lib/rbac";
import {
  AdminTableScroll,
  AdminTableTable,
  AdminTableThead,
  AdminTableHeaderRow,
  AdminTableHeaderCell,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
} from "@/components/admin/AdminTable";
import type { DirectoryUser } from "@/lib/ops/user-directory";

type MeUser = {
  id: string;
  tenantId: string;
  username: string;
  role: Role;
  publicAlias: string | null;
  tenant?: { name: string; tenantCode: string };
};

const ROLES_ORDER: Role[] = ["AGENT", "LEADER", "OPS_MANAGER", "SUPER_ADMIN"];

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

type Props = {
  initialMe: MeUser;
  initialUsers: DirectoryUser[];
};

export default function UsersPageClient({ initialMe, initialUsers }: Props) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const [me, setMe] = useState<MeUser | null>(initialMe);
  const [users, setUsers] = useState<DirectoryUser[]>(initialUsers);

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserResult, setCreateUserResult] = useState<{
    inviteCode: string;
    inviteExpiresAt: string;
    temporaryPassword?: string;
    username: string;
  } | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    publicAlias: "",
    role: "AGENT" as Role,
  });

  const [resetTarget, setResetTarget] = useState<DirectoryUser | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<{
    username: string;
    temporaryPassword: string;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DirectoryUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [aliasTarget, setAliasTarget] = useState<DirectoryUser | null>(null);
  const [aliasValue, setAliasValue] = useState("");
  const [aliasBusy, setAliasBusy] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  useEffect(() => {
    setMe(initialMe);
    setUsers(initialUsers);
  }, [initialMe, initialUsers]);

  const refreshFromServer = useCallback(() => {
    startRefresh(() => {
      router.refresh();
    });
  }, [router]);

  const assignableRoles = useMemo(() => {
    if (!me) return [];
    return ROLES_ORDER.filter((r) => canAssignRole(me.role, r));
  }, [me]);

  const canCreateUser = Boolean(me && canProvisionUsers(me.role));

  const showResetFor = useCallback(
    (row: DirectoryUser) =>
      me ? canResetUserPassword(me.role, row.role) && row.id !== me.id : false,
    [me],
  );

  const showDeleteFor = useCallback(
    (row: DirectoryUser) =>
      me ? canDeleteUser(me.role, row.role) && row.id !== me.id : false,
    [me],
  );

  const showEditAliasFor = useCallback(
    (row: DirectoryUser) => {
      if (!me) return false;
      if (row.id === me.id) return canEditOwnAlias(me.role);
      return canEditAgentAlias(me.role, row.role) || canEditLeaderAlias(me.role, row.role);
    },
    [me],
  );

  function openCreateUserModal() {
    setCreateUserError(null);
    setCreateUserResult(null);
    const first = assignableRoles[0] ?? "AGENT";
    setNewUser((s) => ({ ...s, role: first }));
    setCreateUserOpen(true);
  }

  async function submitCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setCreateUserSubmitting(true);
    setCreateUserError(null);
    try {
      const body: Record<string, unknown> = {
        username: newUser.username.trim(),
        publicAlias: newUser.publicAlias.trim(),
        role: newUser.role,
      };
      if (me.role === "SUPER_ADMIN") {
        body.tenantId = me.tenantId;
      }
      const res = await fetch("/api/ops/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateUserError(
          typeof data?.error === "string" ? data.error : "Request failed.",
        );
        return;
      }
      setCreateUserResult({
        inviteCode: data.inviteCode as string,
        inviteExpiresAt: data.inviteExpiresAt as string,
        temporaryPassword: data.temporaryPassword as string | undefined,
        username: (data.user?.username as string) ?? newUser.username.trim(),
      });
      setNewUser({
        username: "",
        publicAlias: "",
        role: assignableRoles[0] ?? "AGENT",
      });
      refreshFromServer();
    } catch {
      setCreateUserError("Network error.");
    } finally {
      setCreateUserSubmitting(false);
    }
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setResetBusy(true);
    setResetError(null);
    try {
      const res = await fetch("/api/ops/users/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(
          typeof data?.error === "string" ? data.error : "Reset failed.",
        );
        return;
      }
      setResetDone({
        username: data.username as string,
        temporaryPassword: data.temporaryPassword as string,
      });
      setResetTarget(null);
      refreshFromServer();
    } catch {
      setResetError("Network error.");
    } finally {
      setResetBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/ops/users/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(
          typeof data?.error === "string" ? data.error : "Delete failed.",
        );
        return;
      }
      setDeleteTarget(null);
      refreshFromServer();
    } catch {
      setDeleteError("Network error.");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function confirmAliasUpdate() {
    if (!aliasTarget) return;
    setAliasBusy(true);
    setAliasError(null);
    try {
      const res = await fetch(`/api/ops/users/${encodeURIComponent(aliasTarget.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicAlias: aliasValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAliasError(
          typeof data?.error === "string" ? data.error : "Update failed.",
        );
        return;
      }
      setAliasTarget(null);
      setAliasValue("");
      refreshFromServer();
    } catch {
      setAliasError("Network error.");
    } finally {
      setAliasBusy(false);
    }
  }

  return (
    <div className="space-y-10 max-w-[1100px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            User Management
          </h1>
          <p className="text-zinc-500 font-medium text-lg max-w-xl">
            Each person signs in with a tenant code and <strong className="font-semibold text-zinc-700">User ID</strong>
            . Agents use a peer-facing <strong className="font-semibold text-zinc-700">alias</strong> in the marketplace;
            leaders and operations match alias to User ID here for scheduling.
          </p>
        </div>
        {canCreateUser ? (
          <button
            type="button"
            onClick={openCreateUserModal}
            className="shrink-0 bg-black text-white text-[10px] font-bold px-5 py-3 rounded-sm tracking-[0.15em] uppercase hover:bg-zinc-800 transition-colors"
          >
            Create user
          </button>
        ) : null}
      </div>

      <section className="border border-zinc-200 rounded-sm bg-white overflow-hidden">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/80">
          <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-900">
            User Directory
          </h2>
          <p className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
            Total users: {isRefreshing ? "—" : formatTotal(users.length)}
            {isRefreshing ? (
              <span className="ml-2 text-zinc-400 font-medium normal-case tracking-normal">
                (syncing…)
              </span>
            ) : null}
          </p>
        </div>

        <AdminTableScroll>
          <AdminTableTable>
            <AdminTableThead>
              <AdminTableHeaderRow>
                <AdminTableHeaderCell density="comfortable">User ID · alias</AdminTableHeaderCell>
                <AdminTableHeaderCell density="comfortable">Role</AdminTableHeaderCell>
                <AdminTableHeaderCell density="comfortable">Status</AdminTableHeaderCell>
                <AdminTableHeaderCell density="comfortable" className="text-right">
                  Actions
                </AdminTableHeaderCell>
              </AdminTableHeaderRow>
            </AdminTableThead>
            <AdminTableBody>
              {users.length === 0 ? (
                <tr>
                  <AdminTableCell
                    density="comfortable"
                    colSpan={4}
                    className="py-16 text-center text-zinc-400 text-sm"
                  >
                    No users found.
                  </AdminTableCell>
                </tr>
              ) : (
                users.map((u) => (
                  <AdminTableRow key={u.id} className="hover:bg-zinc-50/60">
                    <AdminTableCell density="comfortable">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        User ID
                      </div>
                      <div className="font-mono text-xs font-semibold text-zinc-900">{u.username}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-2">
                        Alias
                      </div>
                      <div className="text-[11px] text-zinc-600">{u.publicAlias}</div>
                    </AdminTableCell>
                    <AdminTableCell density="comfortable" className="text-zinc-800 font-medium">
                      {roleLabel(u.role)}
                    </AdminTableCell>
                    <AdminTableCell density="comfortable">
                      {u.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800">
                          <span
                            className="h-2 w-2 rounded-full bg-emerald-500"
                            aria-hidden
                          />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500">
                          <span
                            className="h-2 w-2 rounded-full bg-zinc-300"
                            aria-hidden
                          />
                          Inactive
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell density="comfortable" className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-wide">
                        {showResetFor(u) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setResetError(null);
                              setResetTarget(u);
                            }}
                            className="text-zinc-900 underline-offset-2 hover:underline"
                          >
                            Reset password
                          </button>
                        ) : null}
                        {showDeleteFor(u) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(u);
                            }}
                            className="text-red-700 underline-offset-2 hover:underline"
                          >
                            Delete
                          </button>
                        ) : null}
                        {showEditAliasFor(u) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAliasError(null);
                              setAliasTarget(u);
                              setAliasValue(u.publicAlias || u.username);
                            }}
                            className="text-zinc-700 underline-offset-2 hover:underline"
                          >
                            Edit alias
                          </button>
                        ) : (
                          <span className="text-zinc-300 cursor-not-allowed select-none">
                            Edit
                          </span>
                        )}
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))
              )}
            </AdminTableBody>
          </AdminTableTable>
        </AdminTableScroll>
      </section>

      {createUserOpen ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-labelledby="create-user-title"
        >
          <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-6 shadow-xl">
            <h3
              id="create-user-title"
              className="text-lg font-black tracking-tight text-zinc-900 mb-1"
            >
              Create user
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Assign a <strong className="font-semibold text-zinc-700">User ID</strong> they will type at login (with tenant code),
              plus an alias shown to other agents. Invite code and temp password are returned once.
            </p>

            {createUserResult ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-700">
                  User ID{" "}
                  <span className="font-semibold">{createUserResult.username}</span>{" "}
                  created. Copy the details below; they will not be shown again.
                </p>
                <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs break-all space-y-2">
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                      Invite code
                    </span>
                    <div className="text-zinc-900 mt-1">
                      {createUserResult.inviteCode}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Expires{" "}
                    {new Date(createUserResult.inviteExpiresAt).toLocaleString()}
                  </div>
                  {createUserResult.temporaryPassword ? (
                    <div className="pt-2 border-t border-zinc-200">
                      <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                        Temp password
                      </span>
                      <div className="text-zinc-900 mt-1">
                        {createUserResult.temporaryPassword}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateUserOpen(false);
                    setCreateUserResult(null);
                  }}
                  className="w-full bg-black text-white text-[10px] font-bold py-3 rounded-sm tracking-widest uppercase hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitCreateUser} className="space-y-4">
                {createUserError ? (
                  <p className="text-sm text-red-600">{createUserError}</p>
                ) : null}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    User ID
                  </label>
                  <p className="text-[11px] text-zinc-500 mb-1.5">
                    Unique within your tenant; used at login with tenant code.
                  </p>
                  <input
                    required
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser((s) => ({ ...s, username: e.target.value }))
                    }
                    className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Peer-facing alias
                  </label>
                  <p className="text-[11px] text-zinc-500 mb-1.5">
                    Shown to other agents; leaders and ops still see User ID here for scheduling.
                  </p>
                  <input
                    required
                    value={newUser.publicAlias}
                    onChange={(e) =>
                      setNewUser((s) => ({ ...s, publicAlias: e.target.value }))
                    }
                    className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser((s) => ({
                        ...s,
                        role: e.target.value as Role,
                      }))
                    }
                    className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateUserOpen(false)}
                    className="flex-1 border border-zinc-200 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createUserSubmitting || assignableRoles.length === 0
                    }
                    className="flex-1 bg-black text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {createUserSubmitting ? "Creating…" : "Create user"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black tracking-tight text-zinc-900 mb-2">
              Reset password
            </h3>
            <p className="text-sm text-zinc-600 mb-6">
              Issue a temporary password for alias{" "}
              <span className="font-semibold text-zinc-900">{resetTarget.publicAlias}</span>
              {" "}(User ID{" "}
              <span className="font-mono font-semibold text-zinc-900">{resetTarget.username}</span>
              ). This action is recorded in the audit log.
            </p>
            {resetError ? (
              <p className="text-sm text-red-600 mb-4">{resetError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="flex-1 border border-zinc-200 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmReset()}
                disabled={resetBusy}
                className="flex-1 bg-black text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
              >
                {resetBusy ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetDone ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black tracking-tight text-zinc-900 mb-2">
              Temporary password
            </h3>
            <p className="text-sm text-zinc-600 mb-4">
              Share this password securely with{" "}
              <span className="font-semibold">{resetDone.username}</span>. They
              must change it on next sign-in.
            </p>
            <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm break-all mb-6">
              {resetDone.temporaryPassword}
            </div>
            <button
              type="button"
              onClick={() => setResetDone(null)}
              className="w-full bg-black text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-labelledby="delete-user-title"
        >
          <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-6 shadow-xl">
            <h3
              id="delete-user-title"
              className="text-lg font-black tracking-tight text-zinc-900 mb-2"
            >
              Delete user
            </h3>
            <p className="text-sm text-zinc-600 mb-6">
              Permanently delete alias{" "}
              <span className="font-semibold text-zinc-900">{deleteTarget.publicAlias}</span>
              {" "}(User ID{" "}
              <span className="font-mono font-semibold text-zinc-900">{deleteTarget.username}</span>
              ). This cannot be undone.
            </p>
            {deleteError ? (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-zinc-200 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteBusy}
                className="flex-1 bg-red-700 text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-red-800 disabled:opacity-50"
              >
                {deleteBusy ? "Working…" : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {aliasTarget ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-labelledby="edit-alias-title"
        >
          <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-6 shadow-xl">
            <h3
              id="edit-alias-title"
              className="text-lg font-black tracking-tight text-zinc-900 mb-2"
            >
              Edit peer-facing alias
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              User ID{" "}
              <span className="font-mono font-semibold text-zinc-800">{aliasTarget.username}</span>
              {" "}does not change. Other agents see the alias below.
            </p>
            {aliasError ? (
              <p className="text-sm text-red-600 mb-4">{aliasError}</p>
            ) : null}
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Alias
            </label>
            <input
              required
              value={aliasValue}
              onChange={(e) => setAliasValue(e.target.value)}
              className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-black mb-6"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAliasTarget(null);
                  setAliasValue("");
                }}
                className="flex-1 border border-zinc-200 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmAliasUpdate()}
                disabled={aliasBusy}
                className="flex-1 bg-black text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50"
              >
                {aliasBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTotal(n: number): string {
  return n.toLocaleString("en-US");
}
