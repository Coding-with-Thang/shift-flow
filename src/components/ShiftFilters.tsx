"use client";

import {
  useFilterStore,
  type WorkType,
  type TimeBucket,
  type DateRange,
  type SortOption,
} from "@/store/useFilterStore";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ShiftFilters() {
  const store = useFilterStore();

  const [skillOpen, setSkillOpen] = useState(false);
  const skillDropdownRef = useRef<HTMLDivElement>(null);
  const availableSkills = ["Calls", "Chat", "Calls - Bilingual", "Chat - Bilingual"];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(event.target as Node)) {
        setSkillOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 px-8 py-4 flex flex-col gap-4 text-xs font-sans text-zinc-800 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap w-full">
          {/* Work Type Segmented Control */}
          <div className="flex bg-white border border-zinc-200 rounded-sm overflow-hidden p-0.5">
            {["All", "Calls", "Chat", "Calls - Bilingual", "Chat - Bilingual"].map((type) => (
              <button
                key={type}
                onClick={() => store.setWorkType(type as WorkType)}
                className={`px-3 py-1.5 font-medium rounded-sm transition-colors ${
                  store.workType === type
                    ? "bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200"
                    : "text-zinc-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Time Bucket Segmented Control */}
          <div className="flex bg-white border border-zinc-200 rounded-sm overflow-hidden p-0.5">
            {["All", "Morning", "Mid-Day", "Evening"].map((bucket) => (
              <button
                key={bucket}
                onClick={() => store.setTimeBucket(bucket as TimeBucket)}
                className={`px-3 py-1.5 font-medium rounded-sm transition-colors ${
                  store.timeBucket === bucket
                    ? "bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200"
                    : "text-zinc-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {bucket}
              </button>
            ))}
          </div>

          {/* Date Range Segmented Control */}
          <div className="flex bg-white border border-zinc-200 rounded-sm overflow-hidden p-0.5">
            {["All", "Today", "Tomorrow", "Next 7 Days"].map((dr) => (
              <button
                key={dr}
                onClick={() => store.setDateRange(dr as DateRange)}
                className={`px-3 py-1.5 font-medium rounded-sm transition-colors ${
                  store.dateRange === dr
                    ? "bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200"
                    : "text-zinc-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {dr}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Skill Combobox (Simplified) */}
          <div className="relative" ref={skillDropdownRef}>
            <button
              onClick={() => setSkillOpen(!skillOpen)}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 rounded-sm bg-white hover:bg-slate-50 transition-colors font-medium"
            >
              Skills ({store.skills.length}) <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {skillOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-zinc-200 rounded-sm shadow-md py-1 z-30">
                {availableSkills.map((skill) => (
                  <label
                    key={skill}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={store.skills.includes(skill)}
                      onChange={() => store.toggleSkill(skill)}
                      className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="font-medium text-zinc-700">{skill}</span>
                  </label>
                ))}
              </div>
            )}
          </div>


        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 font-medium text-zinc-700">
          <span className="text-zinc-500">Sort by:</span>
          <select
            value={store.sortBy}
            onChange={(e) => store.setSortBy(e.target.value as SortOption)}
            className="pl-2 pr-8 py-1.5 border border-zinc-200 rounded-sm bg-white hover:bg-slate-50 outline-none focus:border-zinc-400 appearance-none"
            style={{ backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")" }}
          >
            <option value="Soonest">Soonest</option>
            <option value="Date Asc">Date (Asc)</option>
            <option value="Longest">Length (Longest)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
