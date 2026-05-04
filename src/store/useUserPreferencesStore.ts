import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferencesState {
  timeFormat: "12h" | "24h";
  timezone: string;
  setTimeFormat: (format: "12h" | "24h") => void;
  setTimezone: (timezone: string) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      timeFormat: "12h",
      timezone: "America/Chicago",
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setTimezone: (timezone) => set({ timezone }),
    }),
    {
      name: "user-preferences",
    }
  )
);
