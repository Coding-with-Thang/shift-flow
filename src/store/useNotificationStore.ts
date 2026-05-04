import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  hasNew: boolean;
  lastCheckedAt: string | null;
  setHasNew: (hasNew: boolean) => void;
  markAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      hasNew: false,
      lastCheckedAt: null,
      setHasNew: (hasNew) => set({ hasNew }),
      markAsRead: () => set({ hasNew: false, lastCheckedAt: new Date().toISOString() }),
    }),
    {
      name: "notification-storage",
    }
  )
);
