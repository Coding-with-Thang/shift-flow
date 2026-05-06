import type { ShiftTicket, User } from "@prisma/client";
import { peerAlias } from "@/lib/user-display";

type TicketWithUsers = ShiftTicket & {
  requestor: Pick<User, "id" | "publicAlias" | "username">;
  claimer: Pick<User, "id" | "publicAlias" | "username"> | null;
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
    kind: t.kind,
    status: t.status,
    requestorAlias: peerAlias(t.requestor),
    claimerAlias: t.claimer ? peerAlias(t.claimer) : null,
    tenantCode: t.tenant?.tenantCode,
    tenantName: t.tenant?.name,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    decidedAt: t.decidedAt?.toISOString() ?? null,
  };
}
