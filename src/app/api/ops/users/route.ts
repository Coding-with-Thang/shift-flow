import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canAssignRole, canProvisionUsers, isSuperAdmin } from "@/lib/rbac";
import { hashInviteCode } from "@/lib/auth/password";
import { loginEmailForTenantUser } from "@/lib/auth/login-email";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient, upsertAuthPasswordUser } from "@/lib/supabase/service-role";
import { writeAudit } from "@/lib/audit";

const createSchema = z.object({
  username: z.string().min(2).max(64),
  publicAlias: z.string().min(1).max(64),
  role: z.enum(["AGENT", "LEADER", "OPS_MANAGER", "SUPER_ADMIN"]),
  /** Required when the creator is SUPER_ADMIN (which tenant to attach the user to). */
  tenantId: z.string().min(1).optional(),
  /** Optional initial password; if omitted, user signs up via invite only. */
  password: z.string().min(8).optional(),
});

function randomInvite(): string {
  return randomBytes(12).toString("hex");
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canProvisionUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { username, publicAlias, role, password, tenantId: bodyTenantId } = parsed.data;
  const targetRole = role as Role;
  if (!canAssignRole(session.role, targetRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: targetTenantId },
    select: { tenantCode: true },
  });
  if (!tenantRow) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });
  }

  const plainInvite = randomInvite();
  const codeHash = await hashInviteCode(plainInvite);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let authUserId: string | null = null;
  let admin: SupabaseClient | null = null;
  if (password) {
    try {
      let email: string;
      try {
        email = loginEmailForTenantUser(tenantRow.tenantCode, username);
      } catch {
        return NextResponse.json({ error: "Invalid username or tenant for sign-in email" }, { status: 400 });
      }
      admin = createServiceRoleClient();
      authUserId = await upsertAuthPasswordUser(admin, email, password, {
        tenant_code: tenantRow.tenantCode,
        username,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Could not create Auth user (check SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 503 },
      );
    }
  }

  const user = await prisma.user.create({
    data: {
      tenantId: targetTenantId,
      username,
      passwordHash: null,
      authUserId,
      publicAlias,
      role: role as Role,
    },
  });

  if (authUserId && admin) {
    try {
      await admin.auth.admin.updateUserById(authUserId, {
        user_metadata: { prisma_user_id: user.id, tenant_code: tenantRow.tenantCode, username },
      });
    } catch {
      /* non-fatal */
    }
  }

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
