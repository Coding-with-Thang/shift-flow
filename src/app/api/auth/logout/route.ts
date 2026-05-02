import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/server";

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

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
