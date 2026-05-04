import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/server";

const bodySchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const row = await prisma.user.findFirst({
    where: { id: session.sub, tenantId: session.tenantId },
    select: { authUserId: true },
  });
  if (!row?.authUserId) {
    return NextResponse.json({ error: "Account is not set up for password sign-in" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: currentPassword,
  });
  if (signErr) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const { error: upErr } = await supabase.auth.updateUser({ password: newPassword });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.sub },
    data: { mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
