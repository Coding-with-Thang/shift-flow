import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canDeleteUser, canEditAgentAlias, canEditLeaderAlias, canEditOwnAlias } from "@/lib/rbac";
import { createServiceRoleClient, deleteAuthUser } from "@/lib/supabase/service-role";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z.object({
  publicAlias: z.string().min(1).max(64),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await ctx.params;
  if (!userId) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.tenantId },
    select: { id: true, username: true, publicAlias: true, role: true },
  });
  if (!target || target.username === "_system") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSelf = target.id === session.sub;
  if (
    !canEditAgentAlias(session.role, target.role) &&
    !canEditLeaderAlias(session.role, target.role) &&
    !(isSelf && canEditOwnAlias(session.role))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nextAlias = parsed.data.publicAlias.trim();
  if (!nextAlias) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { publicAlias: nextAlias },
    select: { id: true, username: true, publicAlias: true, role: true },
  });

  await writeAudit({
    tenantId: session.tenantId,
    action: "USER_ALIAS_UPDATED",
    entityType: "User",
    entityId: updated.id,
    actorId: session.sub,
    payload: {
      targetUsername: updated.username,
      targetRole: updated.role,
      previousAlias: target.publicAlias,
      nextAlias: updated.publicAlias,
    },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await ctx.params;
  if (!userId) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  if (userId === session.sub) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.tenantId },
    select: {
      id: true,
      tenantId: true,
      username: true,
      role: true,
      authUserId: true,
    },
  });

  if (!target || target.username === "_system") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!canDeleteUser(session.role, target.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pendingTickets = await prisma.shiftTicket.findMany({
    where: {
      tenantId: session.tenantId,
      requestorId: target.id,
      status: "PENDING",
    },
    orderBy: [{ shiftDate: "asc" }, { startSlot: "asc" }, { id: "asc" }],
    select: {
      id: true,
      shiftDate: true,
      startSlot: true,
      endSlot: true,
      status: true,
    },
  });

  if (target.authUserId) {
    try {
      const admin = createServiceRoleClient();
      await deleteAuthUser(admin, target.authUserId);
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Could not delete Auth user (check SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 503 },
      );
    }
  }

  await prisma.user.delete({
    where: {
      id: target.id,
      tenantId: target.tenantId,
    },
  });

  await writeAudit({
    tenantId: session.tenantId,
    action: "USER_DELETED",
    entityType: "User",
    entityId: target.id,
    actorId: session.sub,
    payload: {
      targetUsername: target.username,
      targetRole: target.role,
      authUserIdDeleted: Boolean(target.authUserId),
      pendingTicketCount: pendingTickets.length,
      pendingTickets: pendingTickets.map((t) => ({
        id: t.id,
        shiftDate: t.shiftDate.toISOString().slice(0, 10),
        startSlot: t.startSlot,
        endSlot: t.endSlot,
        status: t.status,
      })),
    },
  });

  return NextResponse.json({ ok: true, pendingTicketCount: pendingTickets.length });
}

