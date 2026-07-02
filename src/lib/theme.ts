/** Client-safe color theme identifiers and metadata. */

export const COLOR_THEME_IDS = ["light", "dark", "deloitte"] as const;

export type ColorThemeId = (typeof COLOR_THEME_IDS)[number];

export const COLOR_THEME_COOKIE = "aigovernance-color-theme";

export const DEFAULT_COLOR_THEME: ColorThemeId = "light";

export type ColorThemeMeta = {
  id: ColorThemeId;
  label: string;
  description: string;
  preview: {
    primary: string;
    surface: string;
    accent: string;
    text: string;
  };
};

export const COLOR_THEME_META: Record<ColorThemeId, ColorThemeMeta> = {
  light: {
    id: "light",
    label: "Light",
    description: "Clean slate surfaces with indigo accents — the default workspace look.",
    preview: {
      primary: "#4f46e5",
      surface: "#f8fafc",
      accent: "#6366f1",
      text: "#0f172a",
    },
  },
  dark: {
    id: "dark",
    label: "Dark",
    description: "Low-glare dark surfaces with softened indigo highlights for extended use.",
    preview: {
      primary: "#818cf8",
      surface: "#0f172a",
      accent: "#a5b4fc",
      text: "#f1f5f9",
    },
  },
  deloitte: {
    id: "deloitte",
    label: "Deloitte brand",
    description: "Deloitte green (#86BC25) on black and white — professional consulting aesthetic.",
    preview: {
      primary: "#86BC25",
      surface: "#fafafa",
      accent: "#000000",
      text: "#000000",
    },
  },
};

export function isColorThemeId(value: string | null | undefined): value is ColorThemeId {
  return value != null && (COLOR_THEME_IDS as readonly string[]).includes(value);
}
