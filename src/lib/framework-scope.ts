/** Factual scope disclosures — counts and limits sourced from seed manifests, not invented. */

export const FRAMEWORK_SCOPE: Record<
  string,
  { requirementCount: number; scopeNote: string; textNote?: string }
> = {
  "NIST-AI-RMF": {
    requirementCount: 95,
    scopeNote:
      "Full NIST AI RMF 1.0 structure: 4 functions, 19 categories, and 72 playbook subcategories with verbatim playbook text.",
  },
  "COSO-ERM": {
    requirementCount: 20,
    scopeNote:
      "All 20 COSO ERM 2017 principles across 5 components. Component-level rows are not separate requirements.",
  },
  "OECD-AI": {
    requirementCount: 18,
    scopeNote:
      "5 OECD AI Principles plus 13 sub-recommendations from the OECD Recommendation on Artificial Intelligence.",
  },
  "ISO-42001": {
    requirementCount: 62,
    scopeNote:
      "ISO/IEC 42001:2023 main body (clauses 4–10) and Annex A Table A.1 (38 controls).",
    textNote:
      "Requirement text uses ISO clause/control objective language from the standard structure. Replace with licensed verbatim text from your ISO copy before certification audits.",
  },
  "EU-AIA": {
    requirementCount: 36,
    scopeNote:
      "Curated subset of 36 governance articles from Regulation (EU) 2024/1689 covering high-risk provider obligations, GPAI, conformity, registration, transparency, deployer duties, and incident reporting.",
    textNote:
      "This is not the complete EU AI Act (113 articles). Articles not ingested include market surveillance (Art. 23–42), many economic operator provisions, and enforcement chapters. Art. 7 (Annex III amendments) is authority-only and excluded from control mapping.",
  },
};

export function getFrameworkScopeDisclaimer(codes: string[]): string {
  const notes = codes
    .map((c) => FRAMEWORK_SCOPE[c])
    .filter(Boolean)
    .flatMap((s) => [s.scopeNote, s.textNote].filter(Boolean) as string[]);
  return notes.join(" ");
}
