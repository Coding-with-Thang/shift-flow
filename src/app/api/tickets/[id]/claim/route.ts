import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { serializeTicketPublic } from "@/lib/tickets/serialize";
import { canClaimShift } from "@/lib/rbac";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Params) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canClaimShift(session.role)) {
    return NextResponse.json({ error: "Only agents can claim shifts" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.shiftTicket.findFirst({
        where: { id, tenantId: session.tenantId },
      });
      if (!t) throw new Error("NOT_FOUND");
      if (t.requestorId === session.sub) throw new Error("SELF");
      if (t.status !== "PENDING") throw new Error("NOT_OPEN");

      const row = await tx.shiftTicket.updateMany({
        where: { id, tenantId: session.tenantId, status: "PENDING" },
        data: {
          status: "CLAIMED",
          claimerId: session.sub,
        },
      });
      if (row.count === 0) throw new Error("RACE");

      return tx.shiftTicket.findFirstOrThrow({
        where: { id },
        include: {
          requestor: { select: { id: true, publicAlias: true } },
          claimer: { select: { id: true, publicAlias: true } },
          tenant: { select: { tenantCode: true, name: true } },
        },
      });
    });

    await writeAudit({
      tenantId: updated.tenantId,
      action: "TICKET_CLAIMED",
      entityType: "ShiftTicket",
      entityId: updated.id,
      actorId: session.sub,
      shiftTicketId: updated.id,
      payload: {
        requestorId: updated.requestorId,
        claimerId: session.sub,
      },
    });

    return NextResponse.json({ ticket: serializeTicketPublic(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "SELF") return NextResponse.json({ error: "Cannot claim your own ticket" }, { status: 400 });
    if (msg === "NOT_OPEN" || msg === "RACE")
      return NextResponse.json({ error: "Ticket no longer available" }, { status: 409 });
    throw e;
  }
}
