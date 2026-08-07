/** Sentinel value for the industry dropdown "Other" option. */
export const CLIENT_INDUSTRY_OTHER = "__other__";

/**
 * Industries commonly applicable to enterprise AI governance assessments.
 * Sorted alphabetically; "Other" is handled separately in the UI.
 */
export const CLIENT_INDUSTRY_OPTIONS = [
  "Aerospace & Defense",
  "Agriculture & Food Production",
  "Automotive",
  "Banking & Capital Markets",
  "Biotechnology",
  "Chemicals",
  "Construction & Engineering",
  "Consumer Goods & FMCG",
  "Education",
  "Energy & Utilities",
  "Financial Services",
  "Government & Public Sector",
  "Healthcare & Hospitals",
  "Hospitality & Travel",
  "Insurance",
  "Legal Services",
  "Life Sciences & Pharmaceuticals",
  "Manufacturing & Industrial",
  "Media & Entertainment",
  "Mining & Metals",
  "Non-profit & NGO",
  "Oil & Gas",
  "Professional Services & Consulting",
  "Real Estate",
  "Retail & E-commerce",
  "Technology & Software",
  "Telecommunications",
  "Transportation & Logistics",
] as const;

export type ClientIndustryOption = (typeof CLIENT_INDUSTRY_OPTIONS)[number];

export function resolveClientIndustry(
  selection: string,
  customValue: string
): string | null {
  if (!selection) return null;
  if (selection === CLIENT_INDUSTRY_OTHER) {
    const trimmed = customValue.trim();
    return trimmed || null;
  }
  return selection;
}

export function isPresetClientIndustry(value: string | null | undefined): boolean {
  if (!value) return false;
  return (CLIENT_INDUSTRY_OPTIONS as readonly string[]).includes(value);
}

/** Map a stored industry back to dropdown state when editing. */
export function splitClientIndustry(value: string | null | undefined): {
  selection: string;
  custom: string;
} {
  if (!value) return { selection: "", custom: "" };
  if (isPresetClientIndustry(value)) return { selection: value, custom: "" };
  return { selection: CLIENT_INDUSTRY_OTHER, custom: value };
}
