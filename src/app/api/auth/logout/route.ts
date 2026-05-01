import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

export async function POST() {
  const s = await getSession();
  if (s) {
    await writeAudit({
      tenantId: s.tenantId,
      action: "LOGOUT",
      entityType: "User",
      entityId: s.sub,
      actorId: s.sub,
      payload: {},
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
