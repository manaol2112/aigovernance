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

export function filterSurveyControlsByFrameworks(
  controls: SurveyControlItem[],
  frameworkCodes: string[]
): SurveyControlItem[] {
  if (frameworkCodes.length === 0) return controls;
  const selected = new Set(frameworkCodes);
  return controls.filter((control) =>
    control.frameworkCodes.some((code) => selected.has(code))
  );
}

/** Deep-dive follow-ups = framework-scoped controls beyond the baseline quick-scan control. */
export function countPillarFollowUpQuestions(input: {
  quickCatalog: SurveyPillarGroup[];
  deepCatalog: SurveyPillarGroup[];
  pillarId: string;
  frameworkCodes: string[];
  baselineControlId?: string | null;
}): {
  libraryControlCount: number;
  followUpCount: number;
  hasBaseline: boolean;
} {
  const deepGroup = input.deepCatalog.find((group) => group.pillarId === input.pillarId);
  const quickGroup = input.quickCatalog.find((group) => group.pillarId === input.pillarId);

  const scopedDeepControls = filterSurveyControlsByFrameworks(
    deepGroup?.controls ?? [],
    input.frameworkCodes
  );

  const baselineControlId =
    input.baselineControlId ?? quickGroup?.controls[0]?.id ?? scopedDeepControls[0]?.id ?? null;

  const followUpControls = baselineControlId
    ? scopedDeepControls.filter((control) => control.id !== baselineControlId)
    : scopedDeepControls.slice(1);

  return {
    libraryControlCount: scopedDeepControls.length,
    followUpCount: followUpControls.length,
    hasBaseline: baselineControlId != null && scopedDeepControls.some((c) => c.id === baselineControlId),
  };
}

export function sumFollowUpQuestionsAcrossPillars(input: {
  quickCatalog: SurveyPillarGroup[];
  deepCatalog: SurveyPillarGroup[];
  pillarIds: string[];
  frameworkCodes: string[];
  baselineControlIdByPillar?: Map<string, string>;
}): number {
  return input.pillarIds.reduce((sum, pillarId) => {
    const counts = countPillarFollowUpQuestions({
      quickCatalog: input.quickCatalog,
      deepCatalog: input.deepCatalog,
      pillarId,
      frameworkCodes: input.frameworkCodes,
      baselineControlId: input.baselineControlIdByPillar?.get(pillarId) ?? null,
    });
    return sum + counts.followUpCount;
  }, 0);
}

export function flattenSurveyControls(catalog: SurveyPillarGroup[]): SurveyControlItem[] {
  return catalog.flatMap((g) => g.controls);
}

export function normalizeFocusPillarIds(pillarIds: string[]): string[] {
  return [...new Set(pillarIds.filter(Boolean))].sort();
}

export function focusPillarIdsMatch(a: string[], b: string[]): boolean {
  const left = normalizeFocusPillarIds(a);
  const right = normalizeFocusPillarIds(b);
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

/** Empty focus list = all pillars in catalog. */
export function filterCatalogByPillars(
  catalog: SurveyPillarGroup[],
  focusPillarIds: string[]
): SurveyPillarGroup[] {
  const normalized = normalizeFocusPillarIds(focusPillarIds);
  if (normalized.length === 0) return catalog;
  const allowed = new Set(normalized);
  return catalog.filter((group) => allowed.has(group.pillarId));
}

/** Remove baseline / already-covered controls from a deep-dive wizard catalog. */
export function filterCatalogExcludingControls(
  catalog: SurveyPillarGroup[],
  excludeControlIds: ReadonlySet<string>
): SurveyPillarGroup[] {
  if (excludeControlIds.size === 0) return catalog;
  return catalog
    .map((group) => ({
      ...group,
      controls: group.controls.filter((control) => !excludeControlIds.has(control.id)),
    }))
    .filter((group) => group.controls.length > 0);
}

export function formatFocusPillarLabels(
  catalog: SurveyPillarGroup[],
  focusPillarIds: string[]
): string[] {
  const normalized = normalizeFocusPillarIds(focusPillarIds);
  if (normalized.length === 0) {
    return catalog.map((group) => group.pillarLabel);
  }
  const labelById = new Map(catalog.map((group) => [group.pillarId, group.pillarLabel]));
  return normalized
    .map((id) => labelById.get(id))
    .filter((label): label is string => Boolean(label));
}

/** Pick the most cross-framework representative control from the given pool. */
export function pickFlagshipControl(controls: SurveyControlItem[]): SurveyControlItem | null {
  if (controls.length === 0) return null;
  const sorted = [...controls].sort(
    (a, b) => b.frameworkCodes.length - a.frameworkCodes.length
  );
  return sorted[0];
}

/**
 * Assign each control to at most one pillar while guaranteeing every pillar at
 * least one representative control. Scarce pillars are reserved first so shared
 * controls are not all consumed by larger pillars.
 */
export function ensurePillarRepresentativeCoverage(
  catalog: SurveyPillarGroup[]
): SurveyPillarGroup[] {
  const globalAssigned = new Map<string, string>();
  const controlsByPillar = new Map<string, SurveyControlItem[]>(
    catalog.map((group) => [group.pillarId, []])
  );

  const reserveRepresentative = (group: SurveyPillarGroup) => {
    const bucket = controlsByPillar.get(group.pillarId)!;
    if (bucket.length > 0) return;

    const pick = pickFlagshipControl(
      group.controls.filter((control) => !globalAssigned.has(control.id))
    );
    if (!pick) return;

    globalAssigned.set(pick.id, group.pillarId);
    bucket.push(pick);
  };

  const orderedForReservation = [...catalog].sort(
    (a, b) => a.controls.length - b.controls.length
  );

  for (const group of orderedForReservation) {
    reserveRepresentative(group);
  }

  const allControls = new Map<string, SurveyControlItem>();
  for (const group of catalog) {
    for (const control of group.controls) {
      allControls.set(control.id, control);
    }
  }

  for (const group of catalog) {
    reserveRepresentative(group);
    if (controlsByPillar.get(group.pillarId)!.length > 0) continue;

    const fallback = pickFlagshipControl(
      [...allControls.values()].filter((control) => !globalAssigned.has(control.id))
    );
    if (!fallback) continue;

    globalAssigned.set(fallback.id, group.pillarId);
    controlsByPillar.get(group.pillarId)!.push(fallback);
  }

  for (const group of catalog) {
    const bucket = controlsByPillar.get(group.pillarId)!;
    for (const control of group.controls) {
      if (globalAssigned.has(control.id)) continue;
      globalAssigned.set(control.id, group.pillarId);
      bucket.push(control);
    }
  }

  return catalog.map((group) => ({
    ...group,
    controls: controlsByPillar.get(group.pillarId) ?? [],
  }));
}

/** Each control appears in at most one pillar (first match wins). @deprecated use ensurePillarRepresentativeCoverage */
export function dedupeControlsAcrossPillars(catalog: SurveyPillarGroup[]): SurveyPillarGroup[] {
  return ensurePillarRepresentativeCoverage(catalog).filter(
    (group) => group.controls.length > 0
  );
}

/** Reduce catalog to quick-scan (1 unique control per pillar) or deduped deep-dive set. */
export function applySurveyModeToCatalog(
  catalog: SurveyPillarGroup[],
  mode: SurveyMode
): SurveyPillarGroup[] {
  const withCoverage = ensurePillarRepresentativeCoverage(catalog);

  if (mode === "deep_dive") {
    return withCoverage.filter((group) => group.controls.length > 0);
  }

  return withCoverage
    .map((group) => ({
      ...group,
      controls: group.controls.length > 0 ? [group.controls[0]!] : [],
    }))
    .filter((group) => group.controls.length > 0);
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
