"use client";

import React, { useState } from "react";
import { UserSidebar } from "@/components/UserSidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, Clock, Globe, Lock, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { useUserPreferencesStore } from "@/store/useUserPreferencesStore";

const timezones = [
  { label: "(GMT-06:00) Central Time (US & Canada)", value: "America/Chicago" },
  { label: "(GMT-05:00) Eastern Time (US & Canada)", value: "America/New_York" },
  { label: "(GMT-07:00) Mountain Time (US & Canada)", value: "America/Denver" },
  { label: "(GMT-08:00) Pacific Time (US & Canada)", value: "America/Los_Angeles" },
  { label: "(GMT-06:00) Central Time (Mexico City)", value: "America/Mexico_City" },
  { label: "(GMT+00:00) Western European Time", value: "Europe/London" },
];

export default function UserSettingsPage() {
  const { timeFormat, setTimeFormat, timezone, setTimezone } = useUserPreferencesStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Persisted in store via middleware, but simulate delay for UI
    setTimeout(() => {
      setIsSaving(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }, 500);
  };


  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 font-sans">
      <UserSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] relative overflow-hidden">
        <Header title="User Settings" />

        <div className="flex-1 overflow-auto p-12">
          <div className="max-w-3xl mx-auto">
            <div className="mb-12">
              <h1 className="text-4xl font-extrabold tracking-tight text-black mb-4">
                Personal Settings
              </h1>
              <p className="text-zinc-600 text-lg">
                Manage your local preferences and display options.
              </p>
            </div>

            <div className="space-y-10">
              <section className="bg-white border border-zinc-200 rounded-sm p-8 shadow-sm">
                <div className="flex items-start gap-6">
                  <div className="bg-black text-white p-3 rounded-sm">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-black mb-2">Password</h2>
                    <p className="text-zinc-500 text-sm mb-6">
                      Update the password you use to sign in with your tenant code and User ID.
                    </p>
                    <Link
                      href="/account/change-password"
                      className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-black text-sm font-semibold px-5 py-3 rounded-sm transition-colors border border-zinc-200"
                    >
                      Change password
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </section>

              {/* Time Format Section */}
              <section className="bg-white border border-zinc-200 rounded-sm p-8 shadow-sm">
                <div className="flex items-start gap-6">
                  <div className="bg-black text-white p-3 rounded-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-black mb-2">Time Format</h2>
                    <p className="text-zinc-500 text-sm mb-6">
                      Choose how time intervals and shift schedules are displayed across the platform.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setTimeFormat("12h")}
                        className={cn(
                          "flex flex-col items-center justify-center p-6 border-2 rounded-sm transition-all text-center gap-2",
                          timeFormat === "12h"
                            ? "border-black bg-zinc-50 text-black"
                            : "border-zinc-100 hover:border-zinc-300 text-zinc-400"
                        )}
                      >
                        <span className="text-2xl font-black">12:00 PM</span>
                        <span className="text-[10px] font-bold tracking-widest uppercase">Standard AM/PM</span>
                      </button>
                      <button
                        onClick={() => setTimeFormat("24h")}
                        className={cn(
                          "flex flex-col items-center justify-center p-6 border-2 rounded-sm transition-all text-center gap-2",
                          timeFormat === "24h"
                            ? "border-black bg-zinc-50 text-black"
                            : "border-zinc-100 hover:border-zinc-300 text-zinc-400"
                        )}
                      >
                        <span className="text-2xl font-black">12:00</span>
                        <span className="text-[10px] font-bold tracking-widest uppercase">Military Time</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Timezone Section */}
              <section className="bg-white border border-zinc-200 rounded-sm p-8 shadow-sm">
                <div className="flex items-start gap-6">
                  <div className="bg-black text-white p-3 rounded-sm">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-black mb-2">Local Timezone</h2>
                    <p className="text-zinc-500 text-sm mb-6">
                      Synchronize shift displays with your local operational time.
                    </p>

                    <div className="relative">
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-white border border-zinc-300 text-black text-sm font-medium p-4 rounded-sm appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                      >
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Save Footer */}
              <div className="flex items-center justify-end gap-4 pt-6">
                {showSaved && (
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-right-4">
                    <Check className="w-4 h-4" />
                    <span>PREFERENCES SAVED</span>
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "bg-black text-white px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase rounded-sm flex items-center gap-3 hover:bg-zinc-800 transition-all active:scale-[0.98]",
                    isSaving && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
