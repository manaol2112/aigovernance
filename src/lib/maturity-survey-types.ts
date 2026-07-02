/** Client-safe types for maturity survey UI and API payloads. */

import type { SurveyMode } from "@/lib/maturity-survey-mode";

export type SurveyControlItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  controlType: string;
  ownerRole: string;
  frameworkCodes: string[];
};

export type SurveyPillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  frameworkCodes: string[];
  controls: SurveyControlItem[];
};

export function countSurveyQuestions(catalog: SurveyPillarGroup[]): number {
  return catalog.reduce((sum, g) => sum + g.controls.length, 0);
}

export function flattenSurveyControls(catalog: SurveyPillarGroup[]): SurveyControlItem[] {
  return catalog.flatMap((g) => g.controls);
}

/** Pick the most cross-framework representative control for quick-scan mode. */
export function pickFlagshipControl(
  controls: SurveyControlItem[],
  excludeIds?: Set<string>
): SurveyControlItem | null {
  if (controls.length === 0) return null;
  const sorted = [...controls].sort(
    (a, b) => b.frameworkCodes.length - a.frameworkCodes.length
  );
  if (excludeIds?.size) {
    const unique = sorted.find((c) => !excludeIds.has(c.id));
    if (unique) return unique;
  }
  return sorted[0];
}

/** Each control appears in at most one pillar (first match wins). */
export function dedupeControlsAcrossPillars(catalog: SurveyPillarGroup[]): SurveyPillarGroup[] {
  const usedControlIds = new Set<string>();
  return catalog
    .map((group) => ({
      ...group,
      controls: group.controls.filter((c) => {
        if (usedControlIds.has(c.id)) return false;
        usedControlIds.add(c.id);
        return true;
      }),
    }))
    .filter((g) => g.controls.length > 0);
}

/** Reduce catalog to quick-scan (1 unique control per pillar) or deduped deep-dive set. */
export function applySurveyModeToCatalog(
  catalog: SurveyPillarGroup[],
  mode: SurveyMode
): SurveyPillarGroup[] {
  if (mode === "deep_dive") {
    return dedupeControlsAcrossPillars(catalog);
  }

  const usedControlIds = new Set<string>();
  return catalog
    .map((group) => {
      const flagship = pickFlagshipControl(group.controls, usedControlIds);
      if (!flagship) return null;
      usedControlIds.add(flagship.id);
      return { ...group, controls: [flagship] };
    })
    .filter((g): g is SurveyPillarGroup => g != null);
}

/** Flat ordered steps for the survey wizard. */
export type SurveyStep = {
  stepIndex: number;
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  control: SurveyControlItem;
};

export function buildSurveySteps(catalog: SurveyPillarGroup[]): SurveyStep[] {
  const steps: SurveyStep[] = [];
  let stepIndex = 0;
  for (const group of catalog) {
    for (const control of group.controls) {
      steps.push({
        stepIndex,
        pillarId: group.pillarId,
        pillarLabel: group.pillarLabel,
        pillarDescription: group.pillarDescription,
        criticality: group.criticality,
        control,
      });
      stepIndex += 1;
    }
  }
  return steps;
}
