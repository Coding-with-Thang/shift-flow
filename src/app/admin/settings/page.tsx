"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Save,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { slotToTime, timeToSlot } from "@/lib/slots";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [settings, setSettings] = useState({
    operatingHoursStart: "",
    operatingHoursEnd: "",
    enabled: false,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.settings) {
        setSettings({
          operatingHoursStart:
            data.settings.operatingHoursStart !== null
              ? slotToTime(data.settings.operatingHoursStart)
              : "08:00",
          operatingHoursEnd:
            data.settings.operatingHoursEnd !== null
              ? slotToTime(data.settings.operatingHoursEnd)
              : "20:00",
          enabled: data.settings.operatingHoursStart !== null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchSettings();
    })();
  }, [fetchSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      operatingHoursStart: settings.enabled
        ? timeToSlot(settings.operatingHoursStart)
        : null,
      operatingHoursEnd: settings.enabled
        ? timeToSlot(settings.operatingHoursEnd)
        : null,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully." });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to save settings.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "A network error occurred." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-12">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
          System Settings
        </h1>
        <p className="text-zinc-500 font-medium text-lg text-pretty">
          Configure global parameters, business constraints, and operational
          rule thresholds for your organization.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Operating Hours Section */}
        <section className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold tracking-widest uppercase text-black flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Business Operating Hours
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mt-1">
                Restricts shift postings to specific time windows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-bold tracking-widest uppercase ${settings.enabled ? "text-emerald-600" : "text-zinc-400"}`}
              >
                {settings.enabled ? "Active" : "Disabled"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings((s) => ({ ...s, enabled: !s.enabled }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.enabled ? "bg-black" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-300 ${!settings.enabled ? "opacity-40 pointer-events-none" : "opacity-100"}`}
            >
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase">
                  Start of Operations
                </label>
                <input
                  type="time"
                  value={settings.operatingHoursStart}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      operatingHoursStart: e.target.value,
                    }))
                  }
                  className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-zinc-50 font-medium"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-zinc-900 tracking-widest uppercase">
                  End of Operations
                </label>
                <input
                  type="time"
                  value={settings.operatingHoursEnd}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      operatingHoursEnd: e.target.value,
                    }))
                  }
                  className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-zinc-50 font-medium"
                />
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 flex gap-4">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Note on Restrictions
                </p>
                <p className="text-sm text-blue-800/80 leading-relaxed">
                  When enabled, agents will be prevented from posting any shifts
                  that start before or end after these hours. This ensures shift
                  swaps align with business availability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feedback Messages */}
        {message && (
          <div
            className={`p-4 flex gap-3 items-center border animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-red-50 border-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-8 py-4 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-zinc-800 transition-all flex items-center gap-3 disabled:bg-zinc-400"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Advanced Placeholder */}
      <section className="opacity-40 grayscale">
        <div className="px-8 py-6 border border-zinc-200 bg-zinc-50/50">
          <h2 className="text-sm font-bold tracking-widest uppercase text-black flex items-center gap-2">
            Advanced Rule Engine
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mt-1">
            Coming Soon: Automatic approval thresholds and overlap detection
          </p>
        </div>
      </section>
    </div>
  );
}
