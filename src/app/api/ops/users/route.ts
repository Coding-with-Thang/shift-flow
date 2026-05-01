import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canManageUsers, isSuperAdmin } from "@/lib/rbac";
import { hashInviteCode, hashPassword } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";

const createSchema = z.object({
  username: z.string().min(2).max(64),
  publicAlias: z.string().min(1).max(64),
  role: z.enum(["AGENT", "LEADER", "OPS_MANAGER", "SUPER_ADMIN"]),
  /** Required when the creator is SUPER_ADMIN (which tenant to attach the user to). */
  tenantId: z.string().min(1).optional(),
  /** Optional initial password; if omitted, user must use invite code only. */
  password: z.string().min(8).optional(),
});

function randomInvite(): string {
  return randomBytes(12).toString("hex");
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { username, publicAlias, role, password, tenantId: bodyTenantId } = parsed.data;
  if (role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admin can create super admin" }, { status: 403 });
  }

  let targetTenantId = session.tenantId;
  if (isSuperAdmin(session.role)) {
    if (!bodyTenantId) {
      return NextResponse.json(
        { error: "tenantId is required when creating users as super admin" },
        { status: 400 },
      );
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: bodyTenantId },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });
    }
    targetTenantId = tenant.id;
  } else if (bodyTenantId && bodyTenantId !== session.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const temp = randomBytes(32).toString("hex");
  const passwordHash = password ? await hashPassword(password) : await hashPassword(temp);
  const plainInvite = randomInvite();
  const codeHash = await hashInviteCode(plainInvite);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      tenantId: targetTenantId,
      username,
      passwordHash,
      publicAlias,
      role: role as Role,
    },
  });

  await prisma.inviteCode.create({
    data: {
      tenantId: targetTenantId,
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  await writeAudit({
    tenantId: targetTenantId,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    actorId: session.sub,
    payload: { username, role, hasPassword: Boolean(password) },
  });
  await writeAudit({
    tenantId: targetTenantId,
    action: "INVITE_ISSUED",
    entityType: "User",
    entityId: user.id,
    actorId: session.sub,
    payload: { username, inviteExpiresAt: expiresAt.toISOString() },
  });

  return NextResponse.json({
    user: { id: user.id, username, publicAlias, role },
    inviteCode: plainInvite,
    inviteExpiresAt: expiresAt.toISOString(),
  });
}
