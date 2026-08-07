import type { ExplainabilityPayload } from "@/lib/governance-v2/types";

export type ControlReadiness = "effective" | "partial" | "ineffective" | "not_assessed";

export type ReadinessAssessment = {
  readiness: ControlReadiness;
  label: string;
  docCoverage: number | null;
  satisfiesDependency: boolean;
  summary: string;
};

type EvaluationSlice = {
  complianceStatus: string | null;
  implementationStatus: string | null;
  inPlaceFindings: string | null;
  gapFindings: string | null;
  explainability: unknown;
};

export function assessControlReadiness(evaluation: EvaluationSlice | undefined): ReadinessAssessment {
  if (!evaluation) {
    return {
      readiness: "not_assessed",
      label: "Not assessed",
      docCoverage: null,
      satisfiesDependency: false,
      summary: "No assessment data — treat as not ready for dependent controls.",
    };
  }

  const explainability = (evaluation.explainability ?? null) as ExplainabilityPayload | null;
  const docCoverage = explainability?.documentationValidation?.coveragePct ?? null;
  const compliance = evaluation.complianceStatus ?? "not_assessed";
  const impl = evaluation.implementationStatus;

  const hasFindings =
    Boolean(evaluation.inPlaceFindings?.trim()) || Boolean(evaluation.gapFindings?.trim());

  if (compliance === "aligned") {
    const docsOk = docCoverage == null || docCoverage >= 80;
    if (docsOk) {
      return {
        readiness: "effective",
        label: "Effective",
        docCoverage,
        satisfiesDependency: true,
        summary: "Control is aligned and substantiated for dependency purposes.",
      };
    }
    return {
      readiness: "partial",
      label: "Aligned — documentation incomplete",
      docCoverage,
      satisfiesDependency: false,
      summary: "Workshop posture is aligned but required documentation is not fully validated.",
    };
  }

  if (compliance === "partial" || impl === "partial" || impl === "in_progress") {
    return {
      readiness: "partial",
      label: "Partially effective",
      docCoverage,
      satisfiesDependency: false,
      summary: "Partial implementation — dependent controls should not rely on this prerequisite yet.",
    };
  }

  if (compliance === "gap" || impl === "ineffective" || impl === "missing") {
    return {
      readiness: "ineffective",
      label: "Gap / ineffective",
      docCoverage,
      satisfiesDependency: false,
      summary: "Prerequisite is not in place — blocks dependent controls on this path.",
    };
  }

  if (!hasFindings) {
    return {
      readiness: "not_assessed",
      label: "Not assessed",
      docCoverage,
      satisfiesDependency: false,
      summary: "Not yet evaluated against workshop or documentary evidence.",
    };
  }

  return {
    readiness: "not_assessed",
    label: "Insufficient evidence",
    docCoverage,
    satisfiesDependency: false,
    summary: "Findings exist but compliance posture is undetermined.",
  };
}
