"use client";

import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import type { ColorThemeId } from "@/lib/theme";

export function AdminProviders({
  initialTheme,
  children,
}: {
  initialTheme: ColorThemeId;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
