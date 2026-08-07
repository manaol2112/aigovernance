import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  COLOR_THEME_COOKIE,
  DEFAULT_COLOR_THEME,
  isColorThemeId,
  type ColorThemeId,
} from "@/lib/theme";

export async function getColorTheme(): Promise<ColorThemeId> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COLOR_THEME_COOKIE)?.value;
  if (isColorThemeId(fromCookie)) return fromCookie;

  try {
    const setting = await prisma.appSetting.findUnique({ where: { id: "singleton" } });
    if (setting && isColorThemeId(setting.colorTheme)) {
      return setting.colorTheme;
    }
  } catch {
    /* DB unavailable — fall back to default */
  }

  return DEFAULT_COLOR_THEME;
}

export async function setColorTheme(theme: ColorThemeId): Promise<void> {
  await prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", colorTheme: theme },
    update: { colorTheme: theme },
  });
}
