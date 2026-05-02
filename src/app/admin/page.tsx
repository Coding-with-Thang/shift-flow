import React from "react";
import { 
  Timer, 
  Users, 
  Zap, 
  BarChart3, 
  CheckCircle2, 
  XCircle
} from "lucide-react";

const stats = [
  {
    label: "PENDING APPROVALS",
    value: "14",
    icon: Timer,
  },
  {
    label: "ACTIVE USERS",
    value: "12",
    status: "LIVE",
    icon: Users,
  }
];

const activity = [
  { id: "TK-9902", desc: "User ID USR-9021 Claimed SHFT-4429-X", Admin: "SYS-AUTO", time: "14:02:11:442" },
  { id: "TK-9901", desc: "User ID USR-7721 Released SHFT-1022-A", Admin: "SYS-AUTO", time: "14:01:59:102" },
  { id: "TK-9899", desc: "ADM-001 Updated Rule-Set RL-CORE-01", Admin: "ADM-001", time: "13:58:44:882" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-12 max-w-[1400px]">
      {/* Header section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[44px] font-black tracking-tight text-zinc-900 leading-none mb-4">
            Operations Overview
          </h1>
          <p className="text-xl text-zinc-500 font-medium">
            Real-time activity and analytics.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-[#E2E8F0] p-8 space-y-8 relative overflow-hidden group hover:border-zinc-400 transition-colors">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">
                {stat.label}
              </span>
              <stat.icon className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-[42px] font-bold tracking-tighter leading-none">
                {stat.value}
              </span>
            </div>
            {/* Visual fluff for the graph shown in mockup */}
            <div className="absolute top-4 right-4 text-zinc-200">
              <BarChart3 className="w-6 h-6 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-12">
        {/* Activity Table */}
        <div className="col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Recent Activities</h2>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Last Update: 14:02:11:442
            </div>
          </div>
          
          <div className="border border-[#E2E8F0]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Ticket ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Action Description</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Admin</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row) => (
                  <tr key={row.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-5 text-xs font-bold">{row.id}</td>
                    <td className="px-6 py-5 text-xs font-medium text-zinc-600">{row.desc}</td>
                    <td className="px-6 py-5 text-xs font-bold">{row.Admin}</td>
                    <td className="px-6 py-5 text-[10px] font-medium text-zinc-400 font-mono">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar Elements */}
        <div className="space-y-12">
          {/* Infrastructure Status */}
          <div className="relative group overflow-hidden bg-zinc-100 aspect-[4/3] flex flex-col justify-end p-8 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Background image placeholder effect */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-multiply" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase block mb-1">
                Infrastructure Status
              </span>
              <h3 className="text-[40px] font-bold tracking-tight text-white drop-shadow-sm">
                Stable
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
