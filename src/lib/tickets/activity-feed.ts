import type { AuditAction } from "@prisma/client";

/** Actions shown in the per-user marketplace notification feed. */
export const NOTIFICATION_FEED_ACTIONS: AuditAction[] = [
  "TICKET_APPROVED",
  "TICKET_DECLINED",
  "TICKET_CLAIMED",
  "TICKET_CREATED",
];

/** All ticket lifecycle events for tenant-wide admin history. */
export const ADMIN_SHIFT_ACTIVITY_ACTIONS: AuditAction[] = [
  "TICKET_CREATED",
  "TICKET_CLAIMED",
  "TICKET_APPROVED",
  "TICKET_DECLINED",
  "TICKET_CANCELLED",
  "TICKET_EXPIRED",
];

export type TicketAliasSlice = {
  requestor: { publicAlias: string };
  claimer: { publicAlias: string } | null;
  decisionNotes: string | null;
};

export type NotificationActivityBadge = "APPROVED" | "POSTED" | "CLAIMED" | "DECLINED";

export function actionToNotificationBadge(action: AuditAction): NotificationActivityBadge {
  switch (action) {
    case "TICKET_APPROVED":
      return "APPROVED";
    case "TICKET_DECLINED":
      return "DECLINED";
    case "TICKET_CLAIMED":
      return "CLAIMED";
    case "TICKET_CREATED":
      return "POSTED";
    default:
      return "POSTED";
  }
}

export function buildTicketAuditSummary(action: AuditAction, ticket: TicketAliasSlice): string {
  const req = ticket.requestor.publicAlias;
  const cl = ticket.claimer?.publicAlias;

  switch (action) {
    case "TICKET_CREATED":
      return `${req} posted a shift for claim.`;
    case "TICKET_CLAIMED":
      return cl
        ? `${cl} claimed the shift originally posted by ${req}.`
        : `A shift posted by ${req} was claimed.`;
    case "TICKET_APPROVED":
      return cl
        ? `Shift swap between ${req} and ${cl} was approved.`
        : `A shift posted by ${req} was approved.`;
    case "TICKET_DECLINED": {
      const note = ticket.decisionNotes?.trim();
      return note ? `Swap request was declined: ${note}.` : "Swap request was declined.";
    }
    case "TICKET_CANCELLED":
      return `${req} cancelled the shift listing.`;
    case "TICKET_EXPIRED":
      return `Shift posted by ${req} expired without a claim.`;
    default:
      return "Ticket activity.";
  }
}
