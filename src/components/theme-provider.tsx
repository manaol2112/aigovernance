"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_COLOR_THEME,
  isColorThemeId,
  type ColorThemeId,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ColorThemeId;
  setTheme: (theme: ColorThemeId) => Promise<void>;
  saving: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: ColorThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ColorThemeId;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [theme, setThemeState] = useState<ColorThemeId>(initialTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    setThemeState(initialTheme);
    applyThemeToDocument(initialTheme);
  }, [initialTheme]);

  const setTheme = useCallback(
    async (next: ColorThemeId) => {
      setSaving(true);
      applyThemeToDocument(next);
      setThemeState(next);

      try {
        const res = await fetch("/api/admin/settings/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Failed to save theme");
        }
        router.refresh();
      } catch (error) {
        applyThemeToDocument(theme);
        setThemeState(theme);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [router, theme]
  );

  const value = useMemo(() => ({ theme, setTheme, saving }), [theme, setTheme, saving]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColorTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_COLOR_THEME,
      setTheme: async () => {},
      saving: false,
    };
  }
  return ctx;
}

/** Apply theme before hydration when server HTML already has data-theme (no-op safety). */
export function ThemeBootScript({ theme }: { theme: ColorThemeId }) {
  const safe = isColorThemeId(theme) ? theme : DEFAULT_COLOR_THEME;
  const script = `document.documentElement.setAttribute('data-theme',${JSON.stringify(safe)});`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
