import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canApproveShiftTicket, isSuperAdmin } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { serializeTicketPublic } from "@/lib/tickets/serialize";

const bodySchema = z.object({
  decision: z.enum(["APPROVE", "DECLINE"]),
  notes: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Params) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApproveShiftTicket(session.role)) {
    return NextResponse.json(
      { error: "You do not have permission to approve or decline shift swaps" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { decision, notes } = parsed.data;

  const nextStatus = decision === "APPROVE" ? "APPROVED" : "DECLINED";

  const ticket = await prisma.shiftTicket.findFirst({
    where: isSuperAdmin(session.role) ? { id } : { id, tenantId: session.tenantId },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.status !== "CLAIMED") {
    return NextResponse.json({ error: "Ticket is not awaiting approval" }, { status: 400 });
  }

  const updated = await prisma.shiftTicket.update({
    where: { id },
    data: {
      status: nextStatus,
      approverId: session.sub,
      decisionNotes: notes ?? null,
      decidedAt: new Date(),
    },
    include: {
      requestor: { select: { id: true, publicAlias: true, username: true } },
      claimer: { select: { id: true, publicAlias: true, username: true } },
      tenant: { select: { tenantCode: true, name: true } },
    },
  });

  await writeAudit({
    tenantId: ticket.tenantId,
    action: decision === "APPROVE" ? "TICKET_APPROVED" : "TICKET_DECLINED",
    entityType: "ShiftTicket",
    entityId: updated.id,
    actorId: session.sub,
    shiftTicketId: updated.id,
    payload: {
      requestorId: updated.requestorId,
      claimerId: updated.claimerId,
      approverId: session.sub,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({ ticket: serializeTicketPublic(updated) });
}
