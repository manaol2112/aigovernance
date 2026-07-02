import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setColorTheme } from "@/lib/theme-settings";
import { COLOR_THEME_COOKIE, isColorThemeId } from "@/lib/theme";

export async function GET() {
  const { getColorTheme } = await import("@/lib/theme-settings");
  const theme = await getColorTheme();
  return NextResponse.json({ theme });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const theme = (body as { theme?: string }).theme;
  if (!isColorThemeId(theme)) {
    return NextResponse.json(
      { error: "theme must be one of: light, dark, deloitte" },
      { status: 400 }
    );
  }

  await setColorTheme(theme);

  const cookieStore = await cookies();
  cookieStore.set(COLOR_THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return NextResponse.json({ theme, ok: true });
}
