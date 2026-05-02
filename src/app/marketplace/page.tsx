"use client";

import {
  CheckCircle2,
  Headset,
  History,
  Info,
  LayoutGrid,
  List,
  MessageSquare,
  Settings,
  ShieldCheck,
  Store,
  X,
  XCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShiftFilters } from "@/components/ShiftFilters";
import { useFilterStore } from "@/store/useFilterStore";
import { z } from "zod";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const filterSchema = z.object({
  workType: z.enum([
    "All",
    "Calls",
    "Chat",
    "Calls - Bilingual",
    "Chat - Bilingual",
  ]),
  timeBucket: z.enum(["All", "Morning", "Mid-Day", "Evening"]),
  dateRange: z.enum(["All", "Today", "Tomorrow", "Next 7 Days"]),
  skills: z.array(z.string()),
  sortBy: z.enum(["Soonest", "Date Asc", "Longest"]),
});

type ShiftData = {
  id: string;
  shiftTime: string;
  slotStart: number;
  slotEnd: number;
  role: "Calls" | "Chat" | "Calls - Bilingual" | "Chat - Bilingual";
  poster: string;
  eligible: boolean;
  date: Date;
  skills: string[];
  createdAt: Date;
};

// Dummy Data
const now = new Date();
const ALL_SHIFTS: ShiftData[] = [
  {
    id: "1",
    shiftTime: "08:00 — 16:00",
    slotStart: 32, // 08:00
    slotEnd: 64, // 16:00
    role: "Calls - Bilingual",
    poster: "Agent 402",
    eligible: true,
    date: now,
    skills: [],
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "2",
    shiftTime: "12:00 — 20:00",
    slotStart: 48, // 12:00
    slotEnd: 80, // 20:00
    role: "Chat",
    poster: "Agent 115",
    eligible: true,
    date: now,
    skills: ["Tier 2 Support"],
    createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
  },
  {
    id: "3",
    shiftTime: "22:00 — 06:00",
    slotStart: 88, // 22:00
    slotEnd: 24, // 06:00 (next day)
    role: "Calls",
    poster: "Agent 009",
    eligible: false,
    date: now,
    skills: ["Lead Certified"],
    createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 48 hours ago
  },
  {
    id: "4",
    shiftTime: "06:00 — 14:00",
    slotStart: 24, // 06:00
    slotEnd: 56, // 14:00
    role: "Chat",
    poster: "Agent 882",
    eligible: true,
    date: now,
    skills: [],
    createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 72 hours ago
  },
];
const MOCK_TICKETS: Record<string, { role: string }> = {
  "SW-77291": { role: "Calls - Bilingual" },
  "SW-77304": { role: "Chat" },
  "SW-77288": { role: "Calls" },
  "SW-77285": { role: "Chat - Bilingual" },
};

export default function DashboardPage() {
  const store = useFilterStore();
  const [shifts, setShifts] = useState<ShiftData[]>(ALL_SHIFTS);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [claimingShift, setClaimingShift] = useState<ShiftData | null>(null);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<string | null>(null);

  const newShiftsCount = useMemo(() => {
    const twentyFourHoursAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
    return ALL_SHIFTS.filter((s) => s.createdAt.getTime() > twentyFourHoursAgo)
      .length;
  }, []);

  // Simulate API Fetch with Zod Validation
  useEffect(() => {
    const fetchFilteredShifts = async () => {
      setIsLoading(true);
      try {
        // Validate payload before "API call"
        const validQuery = filterSchema.parse({
          workType: store.workType,
          timeBucket: store.timeBucket,
          dateRange: store.dateRange,
          skills: store.skills,
          sortBy: store.sortBy,
        });

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Frontend filtering to simulate backend logic
        let filtered = [...ALL_SHIFTS];

        // Work Type
        if (validQuery.workType !== "All") {
          filtered = filtered.filter((s) => s.role === validQuery.workType);
        }

        // Time Bucket mapping
        if (validQuery.timeBucket !== "All") {
          filtered = filtered.filter((s) => {
            const start = s.slotStart;
            if (validQuery.timeBucket === "Morning")
              return start >= 0 && start <= 47;
            if (validQuery.timeBucket === "Mid-Day")
              return start >= 48 && start <= 67;
            if (validQuery.timeBucket === "Evening")
              return start >= 68 && start <= 95;
            return true;
          });
        }

        // Skills match (now filters by role)
        if (validQuery.skills.length > 0) {
          filtered = filtered.filter((s) => validQuery.skills.includes(s.role));
        }

        // Sorting
        filtered.sort((a, b) => {
          if (validQuery.sortBy === "Soonest") return a.slotStart - b.slotStart;
          if (validQuery.sortBy === "Date Asc")
            return a.date.getTime() - b.date.getTime();
          if (validQuery.sortBy === "Longest") {
            const lenA =
              a.slotEnd < a.slotStart
                ? a.slotEnd + 96 - a.slotStart
                : a.slotEnd - a.slotStart;
            const lenB =
              b.slotEnd < b.slotStart
                ? b.slotEnd + 96 - b.slotStart
                : b.slotEnd - b.slotStart;
            return lenB - lenA; // Longest first
          }
          return 0;
        });

        setShifts(filtered);
      } catch (err) {
        console.error("Filter validation failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredShifts();
  }, [
    store.workType,
    store.timeBucket,
    store.dateRange,
    store.skills,
    store.sortBy,
  ]);

  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 border-r border-zinc-200 flex flex-col bg-[#FAFAFA]">
        <div className="pt-6 pb-8">
          <div className="flex flex-col items-center mb-8 mx-4">
            <div className="bg-black text-white font-bold tracking-[0.1em] px-4 py-1.5 text-xl w-full text-center">
              SHIFTFLOW
            </div>
            <div className="text-[9px] tracking-[0.2em] text-zinc-500 font-semibold uppercase mt-2">
              PROTOCOL V4.2.1
            </div>
          </div>

          <div className="text-xs text-zinc-500 mb-3 px-8">Menu</div>
          <nav className="flex flex-col">
            <div className="flex items-center gap-3 px-8 py-3 bg-zinc-100 border-l-4 border-[#544DFB]">
              <Store className="w-[18px] h-[18px]" />
              <span className="text-sm font-bold text-zinc-900">
                Marketplace
              </span>
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-8 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-l-4 border-transparent hover:border-[#544DFB] transition-colors"
            >
              <ShieldCheck className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Admin Portal</span>
            </Link>
            <Link
              href="/my-activity"
              className="flex items-center gap-3 px-8 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-l-4 border-transparent hover:border-[#544DFB] transition-colors"
            >
              <History className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">My Activity</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-8 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-l-4 border-transparent hover:border-[#544DFB] transition-colors"
            >
              <Settings className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] relative overflow-hidden">
        <Header 
          title="Shift Marketplace" 
          onNotificationClick={() => setNotificationsOpen(true)} 
        />

        {/* Sticky Filter Bar */}
        <ShiftFilters />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Top Section */}
          <div className="flex flex-wrap lg:flex-nowrap gap-6 mb-8 items-stretch">
            {/* Available Today Card */}
            <div className="bg-white border border-zinc-200 rounded-sm p-6 w-[240px] flex-shrink-0 shadow-sm flex flex-col justify-center">
              <h3 className="text-zinc-500 text-sm font-medium mb-4">
                Available
              </h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold leading-none tracking-tight">
                  {isLoading ? "-" : shifts.length}
                </span>
                <span className="text-[#60A5FA] text-xs font-bold mb-1">
                  {newShiftsCount > 0 ? `+${newShiftsCount} New` : "No New"}
                </span>
              </div>
            </div>

            {/* View Toggle (Replaced Old Tabs) */}
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm flex ml-auto">
              <div className="flex items-stretch">
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-4 flex items-center justify-center border-r border-zinc-200 transition-colors ${viewMode === "card" ? "bg-black text-white" : "hover:bg-zinc-50"}`}
                >
                  <LayoutGrid
                    className={`w-[18px] h-[18px] ${viewMode === "card" ? "text-white" : "text-zinc-400"}`}
                  />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-black text-white" : "hover:bg-zinc-50"}`}
                >
                  <List
                    className={`w-[18px] h-[18px] ${viewMode === "list" ? "text-white" : "text-zinc-400"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-14">
            {shifts.length === 0 && !isLoading ? (
              <div className="border border-dashed border-zinc-300 rounded-sm p-12 flex flex-col items-center justify-center bg-white text-zinc-500">
                <span className="text-sm font-medium mb-4">
                  No shifts available matching these criteria.
                </span>
                <button
                  onClick={store.clearAll}
                  className="px-4 py-2 bg-black text-white text-xs font-bold tracking-widest rounded-sm uppercase hover:bg-zinc-800 transition-colors"
                >
                  Clear All
                </button>
              </div>
            ) : viewMode === "list" ? (
              <table
                className={`w-full text-left border-collapse transition-opacity duration-200 ${isLoading ? "opacity-50" : "opacity-100"}`}
              >
                <thead>
                  <tr>
                    <th className="pb-4 pt-2 font-bold text-sm text-zinc-700 border-b border-zinc-300">
                      Shift Time
                    </th>
                    <th className="pb-4 pt-2 font-bold text-sm text-zinc-700 border-b border-zinc-300">
                      Role
                    </th>
                    <th className="pb-4 pt-2 font-bold text-sm text-zinc-700 border-b border-zinc-300">
                      Poster
                    </th>
                    <th className="pb-4 pt-2 font-bold text-sm text-zinc-700 border-b border-zinc-300 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr
                      key={shift.id}
                      className="border-b border-zinc-200 hover:bg-zinc-50/50"
                    >
                      <td className="py-5 text-sm font-medium text-zinc-800">
                        {shift.shiftTime}
                      </td>
                      <td className="py-5 text-sm font-bold text-zinc-900 flex items-center gap-3">
                        {shift.role === "Calls" ? (
                          <Headset className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-zinc-400" />
                        )}
                        {shift.role}
                      </td>
                      <td className="py-5 text-sm italic text-zinc-500">
                        {shift.poster}
                      </td>
                      <td className="py-5 text-right">
                        <button
                          onClick={() => setClaimingShift(shift)}
                          className="bg-black text-white px-5 py-2 text-[10px] font-bold rounded-sm tracking-widest"
                        >
                          CLAIM
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isLoading ? "opacity-50" : "opacity-100"}`}
              >
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-white border border-zinc-200 rounded-sm p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
                        {shift.role === "Calls" ? (
                          <Headset className="w-[18px] h-[18px] text-zinc-500" />
                        ) : (
                          <MessageSquare className="w-[18px] h-[18px] text-zinc-500" />
                        )}
                        {shift.role}
                      </div>
                    </div>

                    <div className="my-2">
                      <div className="text-xl font-bold tracking-tight text-zinc-900">
                        {shift.shiftTime}
                      </div>
                      <div className="text-xs font-medium mt-1.5 flex gap-1 text-zinc-500">
                        <span className="text-zinc-400">Poster:</span>{" "}
                        {shift.poster}
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-100">
                      <button
                        onClick={() => setClaimingShift(shift)}
                        className="w-full bg-black text-white px-4 py-2 text-xs font-bold rounded-sm tracking-widest hover:bg-zinc-800 transition-colors"
                      >
                        CLAIM
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Claim Modal */}
        {claimingShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40">
            <div className="bg-white w-full max-w-[540px] shadow-xl flex flex-col">
              <div className="flex justify-between items-center px-8 py-6 border-b border-zinc-200">
                <h2 className="text-[22px] font-bold tracking-tight text-black">
                  CONFIRM SHIFT CLAIM
                </h2>
                <button
                  onClick={() => setClaimingShift(null)}
                  className="text-zinc-900 hover:text-black"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              <div className="px-8 py-6 flex flex-col gap-8">
                {/* Details */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900">Position</span>
                    <span className="text-zinc-800">{claimingShift.role}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900">Schedule</span>
                    <span className="text-zinc-800">
                      {claimingShift.shiftTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-900">Location/ID</span>
                    <span className="text-zinc-800">
                      {claimingShift.poster}
                    </span>
                  </div>
                </div>

                {/* Compliance */}
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold tracking-[0.15em] text-zinc-900 mb-4 uppercase">
                    COMPLIANCE VERIFICATION
                  </div>
                  <div className="flex items-center justify-between border border-zinc-200 p-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 className="w-[22px] h-[22px] text-zinc-900 stroke-[2]" />
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[13px] font-bold text-zinc-900">
                          Shift Timing
                        </div>
                        <div className="text-[10px] tracking-wide text-zinc-500 uppercase">
                          CURRENT TIME IS BEFORE SHIFT START
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-zinc-900 tracking-wide uppercase">
                      PASS
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-[#0f172a] text-white p-5 flex items-start gap-4">
                  <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-white" />
                  <p className="text-[13px] leading-[1.6] text-zinc-100">
                    By confirming, you agree to fulfill this shift.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setClaimingShift(null)}
                    className="flex-1 border border-zinc-200 py-3.5 text-[11px] font-bold tracking-[0.1em] text-black hover:bg-zinc-50 transition-colors uppercase"
                  >
                    CANCEL
                  </button>
                  <button
                    className="flex-1 bg-black text-white py-3.5 text-[11px] font-bold tracking-[0.1em] hover:bg-zinc-800 transition-colors uppercase"
                    onClick={() => {
                      setClaimingShift(null);
                    }}
                  >
                    CONFIRM CLAIM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Shift Notifications Sidepanel */}
        {isNotificationsOpen && (
          <div className="absolute top-0 right-0 h-full w-[360px] bg-white border-l border-zinc-200 z-50 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="px-6 py-6 border-b border-zinc-200 flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-[17px] font-bold tracking-tight text-zinc-900">
                  Shift Notifications
                </h2>
              </div>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-white flex flex-col">
              {/* Notification Item 1 */}
              <div className="p-6 border-b border-zinc-100 flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-zinc-900 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                      NOW
                    </span>
                    <span className="bg-[#0f172a] text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">
                      APPROVED
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-800 leading-snug">
                    Shift swap between{" "}
                    <span className="font-bold">Agent 402</span> and{" "}
                    <span className="font-bold">Agent 881</span> has been
                    approved by system.
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-zinc-400 italic">
                      ID: SW-77291
                    </span>
                    <button
                      onClick={() => setViewingTicket("SW-77291")}
                      className="text-[10px] font-bold text-zinc-900 tracking-wider uppercase border-b border-zinc-900 pb-0.5 hover:text-zinc-600 transition-colors"
                    >
                      VIEW TICKET
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Item 2 */}
              <div className="p-6 border-b border-zinc-100 flex gap-4">
                <History className="w-5 h-5 text-zinc-900 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                      14 MIN AGO
                    </span>
                    <span className="border border-zinc-300 text-zinc-600 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">
                      POSTED
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-800 leading-snug">
                    <span className="font-bold">Agent 115</span> posted a
                    high-priority morning shift (06:00) for claim.
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-zinc-400 italic">
                      ID: SW-77304
                    </span>
                    <button
                      onClick={() => setViewingTicket("SW-77304")}
                      className="text-[10px] font-bold text-zinc-900 tracking-wider uppercase border-b border-zinc-900 pb-0.5 hover:text-zinc-600 transition-colors"
                    >
                      VIEW TICKET
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Item 3 */}
              <div className="p-6 border-b border-zinc-100 flex gap-4">
                <Info className="w-5 h-5 text-[#60A5FA] flex-shrink-0 mt-0.5" />
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                      2 HR AGO
                    </span>
                    <span className="bg-zinc-100 text-zinc-600 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">
                      CLAIMED
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-800 leading-snug">
                    <span className="font-bold">Agent 402</span> claimed the
                    graveyard shift originally held by{" "}
                    <span className="font-bold">Agent 009</span>.
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-zinc-400 italic">
                      ID: SW-77288
                    </span>
                    <button
                      onClick={() => setViewingTicket("SW-77288")}
                      className="text-[10px] font-bold text-zinc-900 tracking-wider uppercase border-b border-zinc-900 pb-0.5 hover:text-zinc-600 transition-colors"
                    >
                      VIEW TICKET
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Item 4 */}
              <div className="p-6 border-b border-zinc-100 flex gap-4">
                <XCircle className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                      4 HR AGO
                    </span>
                    <span className="border border-zinc-200 text-zinc-400 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">
                      DECLINED
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-800 leading-snug">
                    Swap request SW-77285 was declined due to policy conflict
                    (Shift Proximity).
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-zinc-400 italic">
                      ID: SW-77285
                    </span>
                    <button
                      onClick={() => setViewingTicket("SW-77285")}
                      className="text-[10px] font-bold text-zinc-900 tracking-wider uppercase border-b border-zinc-900 pb-0.5 hover:text-zinc-600 transition-colors"
                    >
                      VIEW TICKET
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 bg-white">
              <button
                className="w-full bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold tracking-widest uppercase py-3.5 rounded-sm transition-colors"
                onClick={() => setNotificationsOpen(false)}
              >
                CLEAR ALL NOTIFICATIONS
              </button>
            </div>
          </div>
        )}

        {/* Ticket Modal */}
        {viewingTicket && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40">
            <div className="bg-[#f9fafb] w-full max-w-[480px] shadow-2xl flex flex-col font-sans">
              <div className="p-8 pb-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] font-bold text-black">
                    {viewingTicket.replace("SW-", "TK-")}
                  </span>
                  <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>APPROVED</span>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      DATE
                    </span>
                    <span className="text-[13px] font-bold text-black">
                      OCT 24, 2023
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      INTERVAL
                    </span>
                    <span className="text-[13px] font-bold text-black">
                      08:00 — 16:15
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-4 border-b border-zinc-300 pb-6">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    ROLE
                  </span>
                  <span className="text-[13px] font-bold text-black">
                    {MOCK_TICKETS[viewingTicket]?.role || "Unknown Role"}
                  </span>
                </div>

                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-zinc-800">
                      CREATED_AT
                    </span>
                    <span className="text-[11px] text-zinc-800 font-medium">
                      2023-10-24 16:15:00 UTC
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-zinc-800">
                      APPROVAL_TIME
                    </span>
                    <span className="text-[11px] text-zinc-800 font-medium">
                      2023-10-24 16:22:11 UTC
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8">
                <button
                  onClick={() => setViewingTicket(null)}
                  className="w-full bg-black hover:bg-zinc-800 transition-colors text-white py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase"
                >
                  CLOSE TICKET
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
