import { create } from "zustand";

export type WorkType = "All" | "Calls" | "Chat" | "Calls - Bilingual" | "Chat - Bilingual";
export type TimeBucket = "Morning" | "Mid-Day" | "Evening" | "All";
export type DateRange = "Today" | "Tomorrow" | "Next 7 Days" | "All";
export type SortOption = "Soonest" | "Date Asc" | "Longest";

interface FilterState {
  workType: WorkType;
  setWorkType: (t: WorkType) => void;

  timeBucket: TimeBucket;
  setTimeBucket: (b: TimeBucket) => void;

  dateRange: DateRange;
  setDateRange: (d: DateRange) => void;

  skills: string[];
  toggleSkill: (s: string) => void;

  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;

  clearAll: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  workType: "All",
  setWorkType: (t) => set({ workType: t }),

  timeBucket: "All",
  setTimeBucket: (b) => set({ timeBucket: b }),

  dateRange: "All",
  setDateRange: (d) => set({ dateRange: d }),

  skills: [],
  toggleSkill: (s) =>
    set((state) => ({
      skills: state.skills.includes(s)
        ? state.skills.filter((x) => x !== s)
        : [...state.skills, s],
    })),

  sortBy: "Soonest",
  setSortBy: (s) => set({ sortBy: s }),

  clearAll: () =>
    set({
      workType: "All",
      timeBucket: "All",
      dateRange: "All",
      skills: [],
      sortBy: "Soonest",
    }),
}));
