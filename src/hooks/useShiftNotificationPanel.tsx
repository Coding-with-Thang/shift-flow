"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { NotificationSidepanel, TicketModal } from "@/components/NotificationSidepanel";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { PublicTicketJson } from "@/lib/tickets/client";

export type ShiftActivityItem = {
  id: string;
  ticketId: string;
  action: string;
  createdAt: string;
  badge: "APPROVED" | "POSTED" | "CLAIMED" | "DECLINED";
  summary: string;
};

/**
 * Shift notification side panel + ticket modal, with polling for unread state.
 * Render `panelLayer` once (e.g. next to the header shell) and call `openPanel` from the bell control.
 */
export function useShiftNotificationPanel(): {
  openPanel: () => void;
  closePanel: () => void;
  panelLayer: ReactNode;
} {
  const [isOpen, setOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<string | null>(null);
  const [activityItems, setActivityItems] = useState<ShiftActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [ticketModalTicket, setTicketModalTicket] = useState<PublicTicketJson | null>(null);
  const [ticketModalLoading, setTicketModalLoading] = useState(false);
  const [sessionLastCheckedAt, setSessionLastCheckedAt] = useState<string | null>(null);

  const { setHasNew, markAsRead, lastCheckedAt } = useNotificationStore();

  useEffect(() => {
    let cancelled = false;
    const checkNewNotifications = async () => {
      try {
        const res = await fetch("/api/tickets/activity");
        if (!res.ok) return;
        const data = (await res.json()) as { items?: ShiftActivityItem[] };
        if (cancelled || !data.items || data.items.length === 0) return;

        const latestActivity = data.items[0].createdAt;
        if (!lastCheckedAt || new Date(latestActivity) > new Date(lastCheckedAt)) {
          setHasNew(true);
        }
      } catch (err) {
        console.error("Failed to check notifications", err);
      }
    };

    void checkNewNotifications();
    const interval = setInterval(() => {
      void checkNewNotifications();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [lastCheckedAt, setHasNew]);

  // When the panel opens: snapshot the read cursor for the UI, mark read, fetch activity.
  // Do not depend on `lastCheckedAt` here — `markAsRead()` updates it every time and would retrigger this effect forever.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      setActivityLoading(true);
      try {
        const res = await fetch("/api/tickets/activity");
        if (!res.ok) {
          if (!cancelled) setActivityItems([]);
          return;
        }
        const data = (await res.json()) as { items?: ShiftActivityItem[] };
        if (!cancelled) setActivityItems(data.items ?? []);
      } catch {
        if (!cancelled) setActivityItems([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, markAsRead]);

  useEffect(() => {
    if (!viewingTicket) return;
    let cancelled = false;
    void (async () => {
      setTicketModalLoading(true);
      try {
        const res = await fetch(`/api/tickets/${viewingTicket}`);
        if (!res.ok) {
          if (!cancelled) setTicketModalTicket(null);
          return;
        }
        const data = (await res.json()) as { ticket?: PublicTicketJson };
        if (!cancelled) setTicketModalTicket(data.ticket ?? null);
      } catch {
        if (!cancelled) setTicketModalTicket(null);
      } finally {
        if (!cancelled) setTicketModalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewingTicket]);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const openPanel = useCallback(() => {
    setSessionLastCheckedAt(lastCheckedAt);
    markAsRead();
    setOpen(true);
  }, [lastCheckedAt, markAsRead]);

  const panelLayer = (
    <>
      <NotificationSidepanel
        isOpen={isOpen}
        onClose={closePanel}
        activityItems={activityItems}
        loading={activityLoading}
        onViewTicket={(ticketId) => setViewingTicket(ticketId)}
        lastCheckedAt={sessionLastCheckedAt}
      />
      <TicketModal
        ticket={ticketModalTicket}
        loading={ticketModalLoading}
        onClose={() => {
          setViewingTicket(null);
          setTicketModalTicket(null);
        }}
      />
    </>
  );

  return { openPanel, closePanel, panelLayer };
}
