/** JSON shape returned by `serializeTicketPublic` from ticket API routes */
export type PublicTicketJson = {
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
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  /** Present on marketplace list/detail when viewer is the poster */
  isMine?: boolean;
};

export async function createShiftTicket(body: {
  shiftDate: string;
  startSlot: number;
  endSlot: number;
  siteTeam?: string;
  skillTag?: string;
}) {
  const res = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data as { ticket: PublicTicketJson };
}

export async function cancelShiftTicket(id: string) {
  const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data as { ticket: PublicTicketJson };
}

export async function claimShiftTicket(id: string) {
  const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data as { ticket: PublicTicketJson };
}

export async function submitShiftTicketDecision(
  id: string,
  body: { decision: "APPROVE" | "DECLINE"; notes?: string },
) {
  const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data as { ticket: PublicTicketJson };
}
