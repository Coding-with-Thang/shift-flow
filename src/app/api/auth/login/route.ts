import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

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

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid tenant or credentials" }, { status: 401 });
  }

  await setSessionCookie({ sub: user.id, tenantId: user.tenantId, role: user.role });
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
    user: { id: user.id, role: user.role, publicAlias: user.publicAlias },
  });
}
