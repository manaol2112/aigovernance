/**
 * Deloitte-inspired brand tokens for the AI Assurance Hub “deloitte” theme.
 *
 * Sources (public / secondary — NOT Brandspace sign-off):
 * - Deloitte Green #86BC25 (PMS 368), black, white
 * - Extended greens from published Financial Advisory toolkit (Green 2/4/6/7)
 * - Digital interactive teal observed on deloitte.com (#1076A8)
 * - Typography: Open Sans (Light for display), Aptos/system fallback
 *
 * Official assets and approval: https://brandspace.deloitte.com/
 * Do not treat this file as Deloitte Brandspace approval.
 */

export const DELOITTE_BRAND = {
  /** Primary brand green — logo dot & disciplined accents (not default button fill) */
  green: "#86BC25",
  green2: "#C4D600",
  green4: "#43B02A",
  green6: "#046A38",
  green7: "#2C5234",
  greenDark: "#6B9620",
  greenDeep: "#3F5C12",
  greenMuted: "#E5F2D0",
  greenSoft: "#EEF7E0",

  black: "#000000",
  charcoal: "#1A1A1A",
  ink: "#000000",
  slate: "#53565A",
  muted: "#666666",
  soft: "#767676",
  line: "#E3E3E3",
  lineStrong: "#D0D0CE",
  white: "#FFFFFF",
  wash: "#FAFAFA",
  surfaceSoft: "#F5F5F5",

  /** Interactive accent used on deloitte.com for links/CTAs (green stays iconic) */
  teal: "#1076A8",
  tealHover: "#0C5D85",
  tealSoft: "#E7F1F6",

  /** Functional severity (supporting, not brand primaries) */
  red: "#DA291C",
  amber: "#ED8B00",
} as const;

export const DELOITTE_BRANDSPACE_URL = "https://brandspace.deloitte.com/";
