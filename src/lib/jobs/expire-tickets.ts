import { prisma } from "../db";
import { hasShiftStarted } from "../slots";
import { writeAudit } from "../audit";
import { getSystemUserId } from "../system-user";

export async function runExpireTicketsJob() {
  const now = new Date();
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  let updated = 0;

  for (const t of tenants) {
    const systemActor = await getSystemUserId(t.id);
    const open = await prisma.shiftTicket.findMany({
      where: {
        tenantId: t.id,
        status: { in: ["PENDING", "CLAIMED"] },
      },
    });

    for (const ticket of open) {
      if (!hasShiftStarted(ticket.shiftDate, ticket.startSlot, now)) continue;

      await prisma.shiftTicket.update({
        where: { id: ticket.id },
        data: { status: "EXPIRED", decidedAt: now },
      });
      await writeAudit({
        tenantId: t.id,
        action: "TICKET_EXPIRED",
        entityType: "ShiftTicket",
        entityId: ticket.id,
        actorId: systemActor,
        shiftTicketId: ticket.id,
        payload: {
          requestorId: ticket.requestorId,
          claimerId: ticket.claimerId,
          automated: true,
        },
      });
      updated += 1;
    }
  }

  return { updated };
}
