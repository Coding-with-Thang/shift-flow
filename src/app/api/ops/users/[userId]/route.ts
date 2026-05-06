import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import {
  canDeleteUser,
  canEditAgentAlias,
  canEditLeaderAlias,
  canEditOwnAlias,
  canEditUserUsername,
} from "@/lib/rbac";
import {
  createServiceRoleClient,
  deleteAuthUser,
  updateAuthUserEmail,
} from "@/lib/supabase/service-role";
import { writeAudit } from "@/lib/audit";
import { loginEmailForTenantUser } from "@/lib/auth/login-email";
import { z } from "zod";

const patchSchema = z
  .object({
    /** Empty string clears custom alias (peers then see User ID / username). */
    publicAlias: z.string().trim().max(64).optional(),
    /** New login User ID; unique per tenant. */
    username: z.string().trim().min(2).max(64).optional(),
  })
  .refine((d) => d.publicAlias !== undefined || d.username !== undefined, {
    message: "Provide publicAlias and/or username",
  });

export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await ctx.params;
  if (!userId) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const body = parsed.data;
  const wantsUsername = body.username !== undefined;
  const wantsAlias = body.publicAlias !== undefined;

  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.tenantId },
    select: {
      id: true,
      username: true,
      publicAlias: true,
      role: true,
      authUserId: true,
      tenant: { select: { tenantCode: true } },
    },
  });
  if (!target || target.username === "_system") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSelf = target.id === session.sub;

  if (wantsUsername && !canEditUserUsername(session.role, target.role, isSelf)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    wantsAlias &&
    !canEditAgentAlias(session.role, target.role) &&
    !canEditLeaderAlias(session.role, target.role) &&
    !(isSelf && canEditOwnAlias(session.role))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let nextUsername = target.username;
  let usernameWillChange = false;

  if (wantsUsername) {
    const trimmed = body.username!;
    if (trimmed !== target.username) {
      try {
        loginEmailForTenantUser(target.tenant.tenantCode, trimmed);
      } catch {
        return NextResponse.json(
          { error: "User ID must contain letters or numbers (normalized for sign-in)." },
          { status: 400 },
        );
      }
      const taken = await prisma.user.findFirst({
        where: {
          tenantId: session.tenantId,
          username: trimmed,
          NOT: { id: target.id },
        },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "User ID already in use" }, { status: 409 });
      }
      nextUsername = trimmed;
      usernameWillChange = true;
    }
  }

  let nextAlias = target.publicAlias;
  let aliasWillChange = false;
  if (wantsAlias) {
    const trimmed = body.publicAlias!;
    const resolved = trimmed.length > 0 ? trimmed : null;
    if ((target.publicAlias ?? null) !== resolved) {
      nextAlias = resolved;
      aliasWillChange = true;
    }
  }

  if (!usernameWillChange && !aliasWillChange) {
    const unchanged = await prisma.user.findFirst({
      where: { id: target.id },
      select: { id: true, username: true, publicAlias: true, role: true },
    });
    return NextResponse.json({ user: unchanged });
  }

  if (usernameWillChange && target.authUserId) {
    try {
      const admin = createServiceRoleClient();
      const newEmail = loginEmailForTenantUser(target.tenant.tenantCode, nextUsername);
      await updateAuthUserEmail(admin, target.authUserId, newEmail);
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Could not update sign-in email (check Supabase configuration)." },
        { status: 503 },
      );
    }
  }

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(usernameWillChange ? { username: nextUsername } : {}),
        ...(aliasWillChange ? { publicAlias: nextAlias } : {}),
      },
      select: { id: true, username: true, publicAlias: true, role: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "User ID already in use" }, { status: 409 });
    }
    throw e;
  }

  if (usernameWillChange) {
    await writeAudit({
      tenantId: session.tenantId,
      action: "USER_USERNAME_UPDATED",
      entityType: "User",
      entityId: updated.id,
      actorId: session.sub,
      payload: {
        targetRole: updated.role,
        previousUsername: target.username,
        nextUsername: updated.username,
      },
    });
  }

  if (aliasWillChange) {
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
  }

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
