import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { resolveTenantListScope } from "@/lib/tenant-scope";
import {
  NOTIFICATION_FEED_ACTIONS,
  actionToNotificationBadge,
  buildTicketAuditSummary,
} from "@/lib/tickets/activity-feed";

/** Marketplace notifications: only your posts/claims and approvals/declines on tickets you’re involved in — not other agents’ new listings. */
function activityWhereForUser(userId: string) {
  return {
    OR: [
      {
        AND: [{ action: "TICKET_CREATED" as const }, { shiftTicket: { is: { requestorId: userId } } }],
      },
      {
        AND: [
          { action: "TICKET_CLAIMED" as const },
          {
            shiftTicket: {
              is: {
                OR: [{ claimerId: userId }, { requestorId: userId }],
              },
            },
          },
        ],
      },
      {
        AND: [
          { action: "TICKET_APPROVED" as const },
          {
            shiftTicket: {
              is: {
                OR: [{ claimerId: userId }, { requestorId: userId }],
              },
            },
          },
        ],
      },
      {
        AND: [
          { action: "TICKET_DECLINED" as const },
          {
            shiftTicket: {
              is: {
                OR: [{ claimerId: userId }, { requestorId: userId }],
              },
            },
          },
        ],
      },
    ],
  };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const tenantWhere =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  const rows = await prisma.auditEvent.findMany({
    where: {
      ...tenantWhere,
      action: { in: NOTIFICATION_FEED_ACTIONS },
      shiftTicketId: { not: null },
      ...activityWhereForUser(session.sub),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      shiftTicket: {
        include: {
          requestor: { select: { publicAlias: true, username: true } },
          claimer: { select: { publicAlias: true, username: true } },
        },
      },
    },
  });

  const items = rows
    .filter((r): r is typeof r & { shiftTicket: NonNullable<(typeof r)["shiftTicket"]> } =>
      Boolean(r.shiftTicket),
    )
    .map((r) => ({
      id: r.id,
      ticketId: r.shiftTicket.id,
      action: r.action,
      createdAt: r.createdAt.toISOString(),
      badge: actionToNotificationBadge(r.action),
      summary: buildTicketAuditSummary(r.action, r.shiftTicket),
    }));

  return NextResponse.json({ items });
}
