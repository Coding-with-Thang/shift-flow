import { NextResponse } from "next/server";
import { runExpireTicketsJob } from "@/lib/jobs/expire-tickets";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await runExpireTicketsJob();
  return NextResponse.json(result);
}
