"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLOR_THEME_IDS,
  COLOR_THEME_META,
  type ColorThemeId,
} from "@/lib/theme";
import { useColorTheme } from "@/components/theme-provider";
import { toast } from "@/components/ui/toast";

function ThemePreviewCard({
  themeId,
  selected,
  onSelect,
  disabled,
}: {
  themeId: ColorThemeId;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const meta = COLOR_THEME_META[themeId];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all",
        selected
          ? "border-[var(--theme-brand)] bg-[var(--theme-brand-muted)] shadow-lg ring-2 ring-[var(--theme-brand)]/20"
          : "border-[var(--theme-border)] bg-[var(--theme-card-bg)] hover:border-[var(--theme-brand)]/40 hover:shadow-md",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      {selected && (
        <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--theme-brand)] text-white">
          <Check className="h-4 w-4" />
        </span>
      )}

      <div
        className="overflow-hidden rounded-xl border shadow-inner"
        style={{ borderColor: "var(--theme-border)" }}
        data-theme-preview={themeId}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ backgroundColor: meta.preview.accent, color: themeId === "deloitte" ? "#fff" : meta.preview.text }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">AI Governance</span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.preview.primary }}
          />
        </div>
        <div className="p-3" style={{ backgroundColor: meta.preview.surface }}>
          <div
            className="mb-2 h-2 w-16 rounded-full"
            style={{ backgroundColor: meta.preview.primary }}
          />
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded bg-black/10" />
            <div className="h-1.5 w-4/5 rounded bg-black/10" />
            <div className="h-1.5 w-3/5 rounded bg-black/10" />
          </div>
          <div
            className="mt-3 inline-block rounded-md px-2 py-1 text-[9px] font-semibold text-white"
            style={{ backgroundColor: meta.preview.primary }}
          >
            Primary action
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-base font-bold text-[var(--theme-text)]">{meta.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          {meta.description}
        </p>
        <div className="mt-3 flex gap-2">
          {Object.values(meta.preview).map((color, i) => (
            <span
              key={i}
              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

export function AdminThemeSettings() {
  const { theme, setTheme, saving } = useColorTheme();
  const [pending, setPending] = useState<ColorThemeId | null>(null);

  async function handleSelect(next: ColorThemeId) {
    if (next === theme || saving) return;
    setPending(next);
    try {
      await setTheme(next);
      toast(`Theme updated to ${COLOR_THEME_META[next].label}.`, { variant: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save theme.", { variant: "error" });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--theme-text)]">
          Appearance & branding
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--theme-text-muted)]">
          Choose a color theme for the entire application. Changes apply immediately across
          dashboards, assessments, and the maturity portal for all users.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--theme-text)]">Active theme</p>
            <p className="text-xs text-[var(--theme-text-muted)]">
              Currently using <strong>{COLOR_THEME_META[theme].label}</strong>
            </p>
          </div>
          {(saving || pending) && (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--theme-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {COLOR_THEME_IDS.map((id) => (
          <ThemePreviewCard
            key={id}
            themeId={id}
            selected={theme === id}
            onSelect={() => handleSelect(id)}
            disabled={saving}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6">
        <h2 className="text-sm font-bold text-[var(--theme-text)]">Deloitte brand notes</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          The Deloitte theme uses official brand green{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">#86BC25</code> as the primary
          accent, replacing indigo throughout the UI. Sidebar and hero surfaces use Deloitte black
          for a consulting-grade look.
        </p>
      </div>
    </div>
  );
}
