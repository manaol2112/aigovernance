import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";

export type FrameworkLibraryMeta = {
  tagline: string;
  focus: string[];
  accentDot: string;
};

export const FRAMEWORK_LIBRARY_META: Record<string, FrameworkLibraryMeta> = {
  "NIST-AI-RMF": {
    tagline: "Voluntary US framework for trustworthy AI across the lifecycle",
    focus: ["Govern", "Map", "Measure", "Manage"],
    accentDot: "bg-blue-600",
  },
  "ISO-42001": {
    tagline: "Certifiable AI management system standard (AIMS)",
    focus: ["Clauses 4–10", "Annex A controls", "AIMS certification"],
    accentDot: "bg-emerald-600",
  },
  "EU-AIA": {
    tagline: "Binding EU regulation for high-risk and GPAI AI systems",
    focus: ["High-risk obligations", "GPAI duties", "Conformity & monitoring"],
    accentDot: "bg-violet-600",
  },
  "OECD-AI": {
    tagline: "International principles for trustworthy AI stewardship",
    focus: ["5 principles", "Sub-recommendations", "Policy alignment"],
    accentDot: "bg-amber-500",
  },
  "COSO-ERM": {
    tagline: "Enterprise risk management integration for AI programs",
    focus: ["5 components", "20 principles", "ICF alignment"],
    accentDot: "bg-rose-600",
  },
};

export function getFrameworkLibraryMeta(code: string): FrameworkLibraryMeta {
  const column = FRAMEWORK_COLUMNS.find((item) => item.code === code);
  return (
    FRAMEWORK_LIBRARY_META[code] ?? {
      tagline: "Governance framework in the assessment library",
      focus: ["Requirements", "Controls", "Crosswalk"],
      accentDot: column?.color ?? "bg-slate-500",
    }
  );
}

export function getFrameworkScope(code: string) {
  return FRAMEWORK_SCOPE[code];
}

export function getFrameworkShortLabel(code: string): string {
  return FRAMEWORK_COLUMNS.find((item) => item.code === code)?.short ?? code;
}
