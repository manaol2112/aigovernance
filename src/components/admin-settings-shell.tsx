"use client";

import { useState } from "react";
import { ClipboardList, Palette } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-page-header";
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
      <AdminPageHeader
        variant="hero"
        eyebrow="Workspace settings"
        title="Admin"
        description="Configure pillar questionnaires for maturity assessment and guided workshop, then tune appearance for the whole workspace."
      >
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
                  "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
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
      </AdminPageHeader>

      <div className="min-w-0">
        {tab === "questionnaires" ? <AdminQuestionnaires /> : <AdminThemeSettings />}
      </div>
    </div>
  );
}
