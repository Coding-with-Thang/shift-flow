import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canManageUsers, canResetUserPassword } from "@/lib/rbac";
import { loginEmailForTenantUser } from "@/lib/auth/login-email";
import { createServiceRoleClient, setAuthUserPassword, upsertAuthPasswordUser } from "@/lib/supabase/service-role";
import { writeAudit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/auth/temp-password";

const bodySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, tenantId: session.tenantId },
    select: {
      id: true,
      username: true,
      role: true,
      authUserId: true,
    },
  });
  if (!target || target.username === "_system") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!canResetUserPassword(session.role, target.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { tenantCode: true },
  });
  if (!tenantRow) return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });

  const temporaryPassword = generateTempPassword();
  let email: string;
  try {
    email = loginEmailForTenantUser(tenantRow.tenantCode, target.username);
  } catch {
    return NextResponse.json({ error: "Invalid username for sign-in email" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  let authUserId = target.authUserId;

  try {
    if (authUserId) {
      await setAuthUserPassword(admin, authUserId, temporaryPassword);
    } else {
      authUserId = await upsertAuthPasswordUser(admin, email, temporaryPassword, {
        prisma_user_id: target.id,
        tenant_code: tenantRow.tenantCode,
        username: target.username,
      });
    }
    try {
      await admin.auth.admin.updateUserById(authUserId, {
        user_metadata: { prisma_user_id: target.id, tenant_code: tenantRow.tenantCode, username: target.username },
      });
    } catch {
      /* non-fatal */
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not update Auth password (check SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 },
    );
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      authUserId,
      mustChangePassword: true,
      passwordHash: null,
    },
  });

  await writeAudit({
    tenantId: session.tenantId,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: target.id,
    actorId: session.sub,
    payload: {
      targetUsername: target.username,
      targetRole: target.role,
      /** Never store the temporary password */
      method: "temporary_password_issued",
    },
  });

  return NextResponse.json({
    temporaryPassword,
    username: target.username,
  });
}
