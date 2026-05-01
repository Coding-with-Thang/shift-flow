import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyInviteCode } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";

const bodySchema = z.object({
  tenantCode: z.string().min(1),
  username: z.string().min(1),
  inviteCode: z.string().min(6),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { tenantCode, username, inviteCode, password } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { tenantCode } });
  if (!tenant) {
    return NextResponse.json({ error: "Invalid tenant or code" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId: tenant.id, username } },
  });
  if (!user) {
    return NextResponse.json({ error: "Invalid tenant or code" }, { status: 400 });
  }

  const invite = await prisma.inviteCode.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!invite) {
    return NextResponse.json({ error: "No valid invite for this user" }, { status: 400 });
  }

  const match = await verifyInviteCode(inviteCode, invite.codeHash);
  if (!match) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await tx.inviteCode.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
  });

  await setSessionCookie({ sub: user.id, tenantId: user.tenantId, role: user.role });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, role: user.role, publicAlias: user.publicAlias },
  });
}
