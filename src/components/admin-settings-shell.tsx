"use client";

import { useState } from "react";
import { ClipboardList, Palette } from "lucide-react";
import { AdminThemeSettings } from "@/components/admin-theme-settings";
import { AdminQuestionnaires } from "@/components/admin-questionnaires";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "questionnaires",
    label: "Questionnaires",
    description: "Packs and catalog defaults",
    icon: ClipboardList,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and branding",
    icon: Palette,
  },
] as const;

export function AdminSettingsShell() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("questionnaires");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200/80">
          Workspace settings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Admin</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          Configure pillar questionnaires for maturity assessment and guided workshop, then tune
          appearance for the whole workspace.
        </p>

        <div className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-all",
                  active
                    ? "bg-white text-slate-900 shadow-lg"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-indigo-600" : "text-slate-400")} />
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span
                    className={cn(
                      "hidden text-[11px] sm:block",
                      active ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="min-w-0">
        {tab === "questionnaires" ? <AdminQuestionnaires /> : <AdminThemeSettings />}
      </div>
    </div>
  );
}
