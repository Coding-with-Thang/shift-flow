import { subDays, startOfDay, endOfDay } from "date-fns";
import { prisma } from "../db";

/** Roll up the previous local calendar day (UTC day boundary is acceptable for daily batch). */
export async function runAnalyticsDailyJob() {
  const ref = subDays(new Date(), 1);
  const dayStart = startOfDay(ref);
  const dayEnd = endOfDay(ref);

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const results: { tenantId: string; day: string }[] = [];

  for (const t of tenants) {
    const [created, claimed, approved, declined, cancelled, expired] = await Promise.all([
      prisma.shiftTicket.count({
        where: { tenantId: t.id, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.auditEvent.count({
        where: { tenantId: t.id, action: "TICKET_CLAIMED", createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.auditEvent.count({
        where: { tenantId: t.id, action: "TICKET_APPROVED", createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.auditEvent.count({
        where: { tenantId: t.id, action: "TICKET_DECLINED", createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.auditEvent.count({
        where: { tenantId: t.id, action: "TICKET_CANCELLED", createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.auditEvent.count({
        where: { tenantId: t.id, action: "TICKET_EXPIRED", createdAt: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    await prisma.analyticsDaily.upsert({
      where: { tenantId_day: { tenantId: t.id, day: dayStart } },
      create: {
        tenantId: t.id,
        day: dayStart,
        ticketsCreated: created,
        claimsMade: claimed,
        approved,
        declined,
        cancelled,
        expired,
      },
      update: {
        ticketsCreated: created,
        claimsMade: claimed,
        approved,
        declined,
        cancelled,
        expired,
      },
    });
    results.push({ tenantId: t.id, day: dayStart.toISOString().slice(0, 10) });
  }

  return { days: results };
}
