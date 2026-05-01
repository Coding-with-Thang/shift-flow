import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { serializeTicketPublic } from "@/lib/tickets/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Params) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const ticket = await prisma.shiftTicket.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.requestorId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ticket.status !== "PENDING" && ticket.status !== "CLAIMED") {
    return NextResponse.json({ error: "Cannot cancel this ticket" }, { status: 400 });
  }

  const updated = await prisma.shiftTicket.update({
    where: { id },
    data: {
      status: "CANCELLED",
      decidedAt: new Date(),
    },
    include: {
      requestor: { select: { id: true, publicAlias: true } },
      claimer: { select: { id: true, publicAlias: true } },
      tenant: { select: { tenantCode: true, name: true } },
    },
  });

  await writeAudit({
    tenantId: updated.tenantId,
    action: "TICKET_CANCELLED",
    entityType: "ShiftTicket",
    entityId: updated.id,
    actorId: session.sub,
    shiftTicketId: updated.id,
    payload: {
      requestorId: updated.requestorId,
      claimerId: updated.claimerId,
    },
  });

  return NextResponse.json({ ticket: serializeTicketPublic(updated) });
}
