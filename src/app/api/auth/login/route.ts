import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loginEmailForTenantUser } from "@/lib/auth/login-email";
import { writeAudit } from "@/lib/audit";
import { createClient } from "@/lib/server";

const bodySchema = z.object({
  tenantCode: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { tenantCode, username, password } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { tenantCode } });
  if (!tenant) {
    return NextResponse.json({ error: "Invalid tenant or credentials" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId: tenant.id, username } },
  });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Invalid tenant or credentials" }, { status: 401 });
  }

  if (!user.authUserId) {
    return NextResponse.json(
      {
        error:
          "Account not linked to sign-in yet. Ask your administrator to set your password or finish account setup.",
      },
      { status: 401 },
    );
  }

  let email: string;
  try {
    email = loginEmailForTenantUser(tenant.tenantCode, username);
  } catch {
    return NextResponse.json({ error: "Invalid tenant or credentials" }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: "Invalid tenant or credentials" }, { status: 401 });
  }

  await writeAudit({
    tenantId: user.tenantId,
    action: "LOGIN_SUCCESS",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    payload: { username: user.username },
  });

  return NextResponse.json({
    ok: true,
    mustChangePassword: user.mustChangePassword,
    user: { id: user.id, role: user.role, publicAlias: user.publicAlias },
  });
}
