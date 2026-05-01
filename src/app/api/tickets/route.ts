import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { assertValidSlotRange } from "@/lib/slots";
import { canApprove } from "@/lib/rbac";
import { serializeTicketPublic } from "@/lib/tickets/serialize";
import { resolveTenantListScope } from "@/lib/tenant-scope";

const createSchema = z.object({
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startSlot: z.number().int().min(0).max(95),
  endSlot: z.number().int().min(1).max(96),
  siteTeam: z.string().optional(),
  skillTag: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "marketplace";
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const baseInclude = {
    requestor: { select: { id: true, publicAlias: true } },
    claimer: { select: { id: true, publicAlias: true } },
    tenant: { select: { tenantCode: true, name: true } },
  } as const;

  const tenantFilter =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  if (view === "marketplace") {
    const rows = await prisma.shiftTicket.findMany({
      where: {
        ...tenantFilter,
        status: "PENDING",
        NOT: { requestorId: session.sub },
      },
      orderBy: [{ shiftDate: "asc" }, { startSlot: "asc" }],
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "mine") {
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, requestorId: session.sub },
      orderBy: { createdAt: "desc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "approvals") {
    if (!canApprove(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, status: "CLAIMED" },
      orderBy: { createdAt: "asc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  return NextResponse.json({ error: "Unknown view" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "AGENT") {
    return NextResponse.json({ error: "Only agents can post shift tickets" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { shiftDate, startSlot, endSlot, siteTeam, skillTag } = parsed.data;
  try {
    assertValidSlotRange(startSlot, endSlot);
  } catch {
    return NextResponse.json({ error: "Invalid slots" }, { status: 400 });
  }

  const date = new Date(`${shiftDate}T12:00:00.000Z`);

  const ticket = await prisma.shiftTicket.create({
    data: {
      tenantId: session.tenantId,
      requestorId: session.sub,
      shiftDate: date,
      startSlot,
      endSlot,
      siteTeam,
      skillTag,
      status: "PENDING",
    },
    include: {
      requestor: { select: { id: true, publicAlias: true } },
      claimer: { select: { id: true, publicAlias: true } },
      tenant: { select: { tenantCode: true, name: true } },
    },
  });

  await writeAudit({
    tenantId: session.tenantId,
    action: "TICKET_CREATED",
    entityType: "ShiftTicket",
    entityId: ticket.id,
    actorId: session.sub,
    shiftTicketId: ticket.id,
    payload: {
      requestorId: session.sub,
      shiftDate: shiftDate,
      startSlot,
      endSlot,
    },
  });

  return NextResponse.json({ ticket: serializeTicketPublic(ticket) });
}
