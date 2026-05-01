import { NextResponse } from "next/server";
import { runAnalyticsDailyJob } from "@/lib/jobs/analytics-daily";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await runAnalyticsDailyJob();
  return NextResponse.json(result);
}
