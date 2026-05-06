import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { assertValidSlotRange, formatSlot } from "@/lib/slots";
import { canApprove } from "@/lib/rbac";
import { serializeTicketPublic } from "@/lib/tickets/serialize";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import type { ShiftTicketKind } from "@prisma/client";

const createSchema = z.object({
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startSlot: z.number().int().min(0).max(95),
  endSlot: z.number().int().min(1).max(96),
  siteTeam: z.string().optional(),
  skillTag: z.string().optional(),
  kind: z.enum(["GIVEAWAY", "REQUEST"]).optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "marketplace";
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const baseInclude = {
    requestor: { select: { id: true, publicAlias: true, username: true } },
    claimer: { select: { id: true, publicAlias: true, username: true } },
    tenant: { select: { tenantCode: true, name: true } },
  } as const;

  const tenantFilter =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  if (view === "marketplace") {
    const rows = await prisma.shiftTicket.findMany({
      where: {
        ...tenantFilter,
        kind: "GIVEAWAY",
        status: "PENDING",
      },
      orderBy: [{ shiftDate: "asc" }, { startSlot: "asc" }],
      include: baseInclude,
    });
    return NextResponse.json({
      tickets: rows.map((row) => ({
        ...serializeTicketPublic(row),
        isMine: row.requestorId === session.sub,
      })),
    });
  }

  if (view === "mine") {
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, requestorId: session.sub, kind: "GIVEAWAY" },
      orderBy: { shiftDate: "desc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "my-requests") {
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, requestorId: session.sub, kind: "REQUEST" },
      orderBy: { shiftDate: "desc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "claimed") {
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, claimerId: session.sub },
      orderBy: { shiftDate: "desc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "approvals") {
    if (!canApprove(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, kind: "GIVEAWAY", status: "CLAIMED" },
      orderBy: { createdAt: "asc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "request-approvals") {
    if (!canApprove(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await prisma.shiftTicket.findMany({
      where: { ...tenantFilter, kind: "REQUEST", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: baseInclude,
    });
    return NextResponse.json({ tickets: rows.map(serializeTicketPublic) });
  }

  if (view === "dashboard") {
    const [available, mine, claimed] = await Promise.all([
      prisma.shiftTicket.findMany({
        where: { ...tenantFilter, status: "PENDING", kind: { in: ["GIVEAWAY", "REQUEST"] } },
        orderBy: [{ shiftDate: "asc" }, { startSlot: "asc" }],
        include: baseInclude,
      }),
      prisma.shiftTicket.findMany({
        where: { ...tenantFilter, requestorId: session.sub, kind: { in: ["GIVEAWAY", "REQUEST"] } },
        orderBy: { shiftDate: "desc" },
        include: baseInclude,
      }),
      prisma.shiftTicket.findMany({
        where: { ...tenantFilter, claimerId: session.sub, kind: "GIVEAWAY" },
        orderBy: { shiftDate: "desc" },
        include: baseInclude,
      }),
    ]);

    return NextResponse.json({
      available: available.map((row) => ({
        ...serializeTicketPublic(row),
        isMine: row.requestorId === session.sub,
      })),
      mine: mine.map(serializeTicketPublic),
      claimed: claimed.map(serializeTicketPublic),
    });
  }

  return NextResponse.json({ error: "Unknown view" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "AGENT") {
    return NextResponse.json({ error: "Only agents can create shift tickets" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { shiftDate, startSlot, endSlot, siteTeam, skillTag } = parsed.data;
  const kind: ShiftTicketKind = (parsed.data.kind ?? "GIVEAWAY") as ShiftTicketKind;
  try {
    assertValidSlotRange(startSlot, endSlot);
    
    // Check operating hours
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { operatingHoursStart: true, operatingHoursEnd: true },
    });

    if (tenant?.operatingHoursStart !== null && tenant?.operatingHoursStart !== undefined) {
      if (startSlot < tenant.operatingHoursStart) {
        return NextResponse.json({ error: `Shift starts before business hours (${formatSlot(tenant.operatingHoursStart)})` }, { status: 400 });
      }
    }
    if (tenant?.operatingHoursEnd !== null && tenant?.operatingHoursEnd !== undefined) {
      if (endSlot > tenant.operatingHoursEnd) {
        return NextResponse.json({ error: `Shift ends after business hours (${formatSlot(tenant.operatingHoursEnd)})` }, { status: 400 });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid slots";
    return NextResponse.json({ error: message }, { status: 400 });
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
      kind,
      status: "PENDING",
    },
    include: {
      requestor: { select: { id: true, publicAlias: true, username: true } },
      claimer: { select: { id: true, publicAlias: true, username: true } },
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
