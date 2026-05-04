import type { ShiftTicket, User } from "@prisma/client";

type TicketWithUsers = ShiftTicket & {
  requestor: Pick<User, "id" | "publicAlias">;
  claimer: Pick<User, "id" | "publicAlias"> | null;
  tenant?: { tenantCode: string; name: string };
};

/** Agents only see aliases; leaders/ops see same for MVP (alias display). Real names not stored in User model. */
export function serializeTicketPublic(t: TicketWithUsers) {
  return {
    id: t.id,
    shiftDate: t.shiftDate.toISOString().slice(0, 10),
    startSlot: t.startSlot,
    endSlot: t.endSlot,
    siteTeam: t.siteTeam,
    skillTag: t.skillTag,
    status: t.status,
    requestorAlias: t.requestor.publicAlias,
    claimerAlias: t.claimer?.publicAlias ?? null,
    tenantCode: t.tenant?.tenantCode,
    tenantName: t.tenant?.name,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    decidedAt: t.decidedAt?.toISOString() ?? null,
  };
}
