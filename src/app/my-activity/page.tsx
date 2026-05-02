"use client";

import { 
  CheckCircle2,
  Clock,
  Eye, 
  FileText, 
  History, 
  MoreVertical, 
  Settings2, 
  ShieldCheck,
  Store, 
  X, 
  XCircle 
} from 'lucide-react';
import Link from 'next/link';
import { Header } from "@/components/Header";

export default function MyActivityPage() {
  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] bg-[#FAFAFA] border-r border-zinc-200 flex flex-col shrink-0">
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
            <Link
              href="/marketplace"
              className="flex items-center gap-3 px-8 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-l-4 border-transparent hover:border-[#544DFB] transition-colors"
            >
              <Store className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Marketplace</span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-8 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-l-4 border-transparent hover:border-[#544DFB] transition-colors"
            >
              <ShieldCheck className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Admin Portal</span>
            </Link>
            <div className="flex items-center gap-3 px-8 py-3 bg-zinc-100 border-l-4 border-[#544DFB]">
              <History className="w-[18px] h-[18px]" />
              <span className="text-sm font-bold text-zinc-900">
                My Activity
              </span>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-8 py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-l-4 border-transparent hover:border-[#544DFB] transition-colors"
            >
              <Settings2 className="w-[18px] h-[18px]" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] relative overflow-hidden">
        <Header title="My Activity" />
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-12">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-12">
              <div className="max-w-xl">
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-black">My Activity</h1>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Audit log of your historical and pending shift transfers. All timestamps are displayed in 15-minute operational intervals.
                </p>
              </div>
              <div className="flex gap-3">
                <button className="bg-black text-white px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors rounded-sm">
                  Post Shift
                </button>
              </div>
            </div>

            {/* Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Left Column: Given Away */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-black pb-3">
                  <h2 className="text-[11px] font-bold tracking-widest uppercase text-black">Shifts I've Given Away</h2>
                  <span className="text-[11px] text-zinc-500">4 total records</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  {/* Card 1: Approved */}
                  <div className="border border-zinc-200 p-5 rounded-sm flex justify-between items-start">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-black">SHFT-4429-X</span>
                        <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-black">OCT 24 • 08:00 — 16:45</div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-xs text-zinc-500 mb-0.5">
                            Claimed by <span className="text-black font-bold">USR-9021</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">Processed 2h ago</div>
                        </div>
                        <button className="text-zinc-400 hover:text-black transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Pending */}
                  <div className="border border-zinc-200 p-5 rounded-sm flex justify-between items-start">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-black">SHFT-5110-A</span>
                        <div className="flex items-center gap-1.5 border border-zinc-300 text-black px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-black">OCT 26 • 09:15 — 17:30</div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-xs text-black font-medium mb-0.5">
                            Unclaimed <span className="text-zinc-500 font-normal italic">• Available in Marketplace</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">Posted 14h ago</div>
                        </div>
                        <button className="text-zinc-400 hover:text-black transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Expired */}
                  <div className="border border-zinc-200 bg-zinc-100/50 p-5 rounded-sm flex justify-between items-start">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-zinc-400">SHFT-3902-Z</span>
                        <div className="flex items-center gap-1.5 bg-zinc-200 text-zinc-500 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm">
                          <X className="w-3 h-3" />
                          <span>Expired</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-zinc-500">OCT 21 • 14:00 — 22:00</div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-xs text-zinc-500 italic mb-0.5">
                            Requirement unmet by deadline
                          </div>
                          <div className="text-[11px] text-zinc-400">Archived Oct 22</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>

              {/* Right Column: Taken */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-black pb-3">
                  <h2 className="text-[11px] font-bold tracking-widest uppercase text-black">Shifts I've Taken</h2>
                  <span className="text-[11px] text-zinc-500">2 total records</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  {/* Card 4: Approved */}
                  <div className="border border-zinc-200 p-5 rounded-sm flex justify-between items-start">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-black">SHFT-8812-B</span>
                        <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-black">OCT 25 • 06:00 — 14:00</div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-xs text-zinc-500 mb-0.5">
                            Posted by <span className="text-black font-bold">USR-4288</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">Acquired 1d ago</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="text-zinc-400 hover:text-black transition-colors">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button className="text-zinc-400 hover:text-black transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Pending Approval */}
                  <div className="border border-zinc-200 p-5 rounded-sm flex justify-between items-start">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-black">SHFT-0922-M</span>
                        <div className="flex items-center gap-1.5 border border-zinc-300 text-black px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase rounded-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Approval</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-black">OCT 27 • 12:45 — 21:00</div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-xs text-zinc-500 mb-0.5">
                            Posted by <span className="text-black font-bold">USR-1154</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">Claim submitted 5m ago</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="text-zinc-400 hover:text-black transition-colors">
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button className="text-zinc-400 hover:text-black transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
