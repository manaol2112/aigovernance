import { prisma } from "@/lib/db";
import { getPillarControlTreeForAssessment } from "@/lib/pillar-control-tree";
import { getScopedControlsForAssessment } from "@/lib/control-scoping";
import { RISK_PILLARS, type RiskPillarDef } from "@/lib/risk-control-matrix";
import {
  enrichReportNarratives,
} from "@/lib/report-narrative-generator";
import type { MaturityLevel } from "@prisma/client";

export type DisplayFindings = {
  inPlace: string;
  gap: string;
  recommendation: string;
};

export type PriorityRiskSummary = {
  controlCode: string;
  controlTitle: string;
  pillarLabel: string;
  summary: string;
  businessImpact?: string;
};

export type ReviewedControlRecord = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  pillarId: string;
  pillarLabel: string;
  pillarCriticality: string;
  complianceStatus: string;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  reviewerNotes: string | null;
  displayFindings?: DisplayFindings;
};

export type PillarMaturityRecord = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  criticality: string;
  totalControls: number;
  reviewedControls: number;
  alignedCount: number;
  partialCount: number;
  gapCount: number;
  reviewProgressPct: number;
  alignmentPct: number;
  maturityLevel: MaturityLevel;
  maturityLabel: string;
};

export type RoadmapStep = {
  priority: number;
  phase: "immediate" | "short_term" | "medium_term";
  phaseLabel: string;
  pillarLabel: string;
  controlCode: string;
  controlTitle: string;
  complianceStatus: string;
  action: string;
  ownerHint: string;
};

export type ControlReviewReportData = {
  generatedAt: string;
  clientName: string;
  assessmentName: string;
  reviewStats: {
    total: number;
    confirmed: number;
    pendingReview: number;
    rejected: number;
    reviewCompletePct: number;
    reportingReady: boolean;
  };
  executiveSummary: {
    headline: string;
    narrative: string;
    alignedControls: number;
    gapControls: number;
    partialControls: number;
    pillarsAtRisk: number;
    topGaps: PriorityRiskSummary[];
    boardActions: string[];
    narrativesSource?: "ai" | "deterministic" | "none";
  };
  reviewedControls: ReviewedControlRecord[];
  pillarMaturity: PillarMaturityRecord[];
  roadmap: RoadmapStep[];
};

const MATURITY_LABELS: Record<MaturityLevel, string> = {
  not_implemented: "Not Implemented",
  initial: "Initial",
  developing: "Developing",
  defined: "Defined",
  managed: "Managed",
  optimized: "Optimized",
};

function alignmentToMaturity(alignmentPct: number, reviewedCount: number): MaturityLevel {
  if (reviewedCount === 0) return "not_implemented";
  if (alignmentPct >= 91) return "optimized";
  if (alignmentPct >= 76) return "managed";
  if (alignmentPct >= 51) return "defined";
  if (alignmentPct >= 26) return "developing";
  return "initial";
}

function firstLine(text: string): string {
  const line = text.split("\n").map((l) => l.replace(/\[\{\d+\}\]/g, "").trim()).find(Boolean);
  return line ?? "Address identified governance gap.";
}

function pillarForControl(
  controlId: string,
  pillars: Awaited<ReturnType<typeof getPillarControlTreeForAssessment>>
): { pillar: RiskPillarDef; control: { code: string; title: string; ownerRole: string } } | null {
  for (const group of pillars) {
    const control = group.controls.find((c) => c.id === controlId);
    if (control) {
      const pillarDef = RISK_PILLARS.find((p) => p.id === group.pillarId);
      if (pillarDef) {
        return {
          pillar: pillarDef,
          control: { code: control.code, title: control.title, ownerRole: control.ownerRole },
        };
      }
    }
  }
  return null;
}

const CRITICALITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

export async function buildControlReviewReportData(
  assessmentId: string,
  department?: string | null,
  options?: { enrichNarratives?: boolean; refreshNarratives?: boolean }
): Promise<ControlReviewReportData> {
  const [assessment, pillars, scopedControls, evaluations] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { name: true, clientName: true },
    }),
    getPillarControlTreeForAssessment(assessmentId, department),
    getScopedControlsForAssessment(assessmentId, department),
    prisma.controlEvaluation.findMany({
      where: { assessmentId },
      include: {
        control: { select: { code: true, title: true, ownerRole: true } },
      },
    }),
  ]);

  if (!assessment) throw new Error("Assessment not found");

  const scopedIds = new Set(scopedControls.map((c) => c.id));
  const scopedEvals = evaluations.filter((e) => scopedIds.has(e.controlId));

  const total = scopedControls.length;
  const confirmed = scopedEvals.filter((e) => e.status === "human_confirmed").length;
  const rejected = scopedEvals.filter((e) => e.status === "rejected").length;
  const pendingReview = total - confirmed;

  const reviewedEvals = scopedEvals.filter((e) => e.status === "human_confirmed");

  const reviewedControls: ReviewedControlRecord[] = reviewedEvals.map((ev) => {
    const meta = pillarForControl(ev.controlId, pillars);
    return {
      controlId: ev.controlId,
      controlCode: ev.control.code,
      controlTitle: ev.control.title,
      pillarId: meta?.pillar.id ?? "unknown",
      pillarLabel: meta?.pillar.label ?? "Unassigned",
      pillarCriticality: meta?.pillar.criticality ?? "medium",
      complianceStatus: ev.complianceStatus,
      inPlaceFindings: ev.inPlaceFindings,
      gapFindings: ev.gapFindings,
      recommendations: ev.recommendations,
      confirmedBy: ev.confirmedBy,
      confirmedAt: ev.confirmedAt?.toISOString() ?? null,
      reviewerNotes: ev.reviewerNotes,
    };
  });

  const pillarMaturity: PillarMaturityRecord[] = pillars.map((group) => {
    const pillarDef = RISK_PILLARS.find((p) => p.id === group.pillarId)!;
    const controlIds = new Set(group.controls.map((c) => c.id));
    const pillarEvals = scopedEvals.filter((e) => controlIds.has(e.controlId));
    const reviewed = pillarEvals.filter((e) => e.status === "human_confirmed");
    const alignedCount = reviewed.filter((e) => e.complianceStatus === "aligned").length;
    const partialCount = reviewed.filter((e) => e.complianceStatus === "partial").length;
    const gapCount = reviewed.filter(
      (e) => e.complianceStatus === "gap" || e.complianceStatus === "not_assessed"
    ).length;
    const reviewProgressPct =
      group.controls.length > 0 ? Math.round((reviewed.length / group.controls.length) * 100) : 0;
    const alignmentPct =
      reviewed.length > 0 ? Math.round((alignedCount / reviewed.length) * 100) : 0;
    const maturityLevel = alignmentToMaturity(alignmentPct, reviewed.length);

    return {
      pillarId: group.pillarId,
      pillarLabel: group.pillarLabel,
      pillarDescription: group.pillarDescription,
      criticality: group.criticality,
      totalControls: group.controls.length,
      reviewedControls: reviewed.length,
      alignedCount,
      partialCount,
      gapCount,
      reviewProgressPct,
      alignmentPct,
      maturityLevel,
      maturityLabel: MATURITY_LABELS[maturityLevel],
    };
  });

  const gapRecords = reviewedControls.filter(
    (c) => c.complianceStatus === "gap" || c.complianceStatus === "partial" || c.complianceStatus === "not_assessed"
  );

  const roadmap: RoadmapStep[] = gapRecords
    .map((c) => ({
      record: c,
      criticalityRank: CRITICALITY_ORDER[c.pillarCriticality] ?? 2,
      statusRank: c.complianceStatus === "gap" ? 0 : c.complianceStatus === "not_assessed" ? 1 : 2,
    }))
    .sort(
      (a, b) =>
        a.criticalityRank - b.criticalityRank ||
        a.statusRank - b.statusRank ||
        a.record.controlCode.localeCompare(b.record.controlCode)
    )
    .map((item, index) => {
      const phase =
        item.statusRank === 0
          ? ("immediate" as const)
          : item.statusRank === 1
            ? ("short_term" as const)
            : ("medium_term" as const);
      const phaseLabels = {
        immediate: "Phase 1 — Immediate (0–90 days)",
        short_term: "Phase 2 — Short term (90–180 days)",
        medium_term: "Phase 3 — Medium term (180+ days)",
      };
      return {
        priority: index + 1,
        phase,
        phaseLabel: phaseLabels[phase],
        pillarLabel: item.record.pillarLabel,
        controlCode: item.record.controlCode,
        controlTitle: item.record.controlTitle,
        complianceStatus: item.record.complianceStatus,
        action: firstLine(item.record.recommendations),
        ownerHint: item.record.pillarLabel.split(" ")[0] + " owner",
      };
    });

  const alignedControls = reviewedControls.filter((c) => c.complianceStatus === "aligned").length;
  const gapControls = reviewedControls.filter((c) => c.complianceStatus === "gap").length;
  const partialControls = reviewedControls.filter((c) => c.complianceStatus === "partial").length;
  const pillarsAtRisk = pillarMaturity.filter(
    (p) => p.reviewedControls > 0 && p.gapCount + p.partialCount > p.alignedCount
  ).length;

  const topGaps: PriorityRiskSummary[] = gapRecords
    .filter((c) => c.complianceStatus === "gap")
    .slice(0, 5)
    .map((c) => ({
      controlCode: c.controlCode,
      controlTitle: c.controlTitle,
      pillarLabel: c.pillarLabel,
      summary: firstLine(c.gapFindings),
    }));

  const reviewCompletePct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const reportingReady = confirmed === total && total > 0;

  const narrative = reportingReady
    ? `All ${total} in-scope controls have been reviewed and signed off. Among confirmed findings, ${alignedControls} control(s) are aligned, ${partialControls} show partial coverage, and ${gapControls} have material gaps requiring remediation across ${pillarsAtRisk} risk pillar(s).`
    : `${confirmed} of ${total} controls (${reviewCompletePct}%) are reviewed and signed off. Reporting includes only confirmed controls; ${pendingReview} control(s) remain pending review and are excluded from formal deliverables.`;

  const baseReport: ControlReviewReportData = {
    generatedAt: new Date().toISOString(),
    clientName: assessment.clientName ?? assessment.name,
    assessmentName: assessment.name,
    reviewStats: {
      total,
      confirmed,
      pendingReview,
      rejected,
      reviewCompletePct,
      reportingReady,
    },
    executiveSummary: {
      headline: reportingReady
        ? "Assessment review complete — reporting package ready"
        : `Review in progress — ${pendingReview} control(s) pending sign-off`,
      narrative,
      alignedControls,
      gapControls,
      partialControls,
      pillarsAtRisk,
      topGaps,
      boardActions: [],
    },
    reviewedControls,
    pillarMaturity,
    roadmap,
  };

  if (options?.enrichNarratives === false) {
    return baseReport;
  }

  return enrichReportNarratives(assessmentId, department ?? null, baseReport, {
    forceRefresh: options?.refreshNarratives,
  });
}

export { MATURITY_LABELS };
