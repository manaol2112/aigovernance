"use client";

import { Palette } from "lucide-react";
import { useColorTheme } from "@/components/theme-provider";
import { COLOR_THEME_IDS, COLOR_THEME_META, type ColorThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Compact global theme cycle for the app sidebar (Appearance is the full picker). */
export function SidebarThemeCycle({ expanded }: { expanded: boolean }) {
  const { theme, setTheme, saving } = useColorTheme();
  const meta = COLOR_THEME_META[theme];

  async function cycle() {
    const idx = COLOR_THEME_IDS.indexOf(theme);
    const next = COLOR_THEME_IDS[(idx + 1) % COLOR_THEME_IDS.length] as ColorThemeId;
    await setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={() => void cycle()}
      disabled={saving}
      className={cn(
        "flex w-full items-center rounded-xl text-slate-400 transition-all duration-200",
        "hover:bg-white/10 hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        expanded ? "gap-2 px-3 py-2 text-xs font-medium" : "justify-center p-2.5",
        saving && "opacity-60"
      )}
      aria-label={`Color theme: ${meta.label}. Activate to cycle themes.`}
      title={`Theme: ${meta.label}`}
    >
      <Palette className="h-4 w-4 shrink-0" aria-hidden />
      {expanded && <span className="truncate">Theme · {meta.label}</span>}
    </button>
  );
}
