export type ReadinessCheckId =
  | "validation_complete"
  | "analysis_current"
  | "evaluation_approved"
  | "package_generated";

export type ReadinessCheck = {
  id: ReadinessCheckId;
  label: string;
  detail: string;
  complete: boolean;
  blocking: boolean;
};

export type EngagementReadiness = {
  checks: ReadinessCheck[];
  readyForClientPackage: boolean;
  readyForFinalize: boolean;
  blockers: string[];
};

export function resolveEngagementReadiness(input: {
  controlConfirmed: number;
  controlTotal: number;
  analysisStale?: boolean;
  hasAnalysis?: boolean;
  evaluationReviewApproved?: boolean;
  workflowStage?: string;
  deliverableCheckpointStatus?: string;
}): EngagementReadiness {
  const validationComplete =
    input.controlTotal > 0 && input.controlConfirmed >= input.controlTotal;
  const analysisCurrent = Boolean(input.hasAnalysis) && !input.analysisStale;
  const evaluationApproved = Boolean(input.evaluationReviewApproved);
  const isDeliverables =
    input.workflowStage === "deliverables" || input.workflowStage === "finalized";
  const packageApproved = input.deliverableCheckpointStatus === "approved";

  const checks: ReadinessCheck[] = [
    {
      id: "validation_complete",
      label: "Controls signed off",
      detail:
        input.controlTotal > 0
          ? `${input.controlConfirmed} of ${input.controlTotal} controls validated`
          : "No controls in scope yet",
      complete: validationComplete,
      blocking: true,
    },
    {
      id: "analysis_current",
      label: "Evidence analysis current",
      detail: analysisCurrent
        ? "Sources analyzed and mapped"
        : input.analysisStale
          ? "Re-analyze after source changes"
          : "Run governance analysis on uploaded sources",
      complete: analysisCurrent,
      blocking: false,
    },
    {
      id: "evaluation_approved",
      label: "Evaluation review approved",
      detail: evaluationApproved
        ? "Assessment attestation recorded"
        : "Attest validation before client package",
      complete: evaluationApproved,
      blocking: !isDeliverables,
    },
    {
      id: "package_generated",
      label: "Client package approved",
      detail: packageApproved
        ? "Deliverables approved for delivery"
        : isDeliverables
          ? "Approve package after final review"
          : "Available after proceeding to client package",
      complete: packageApproved,
      blocking: isDeliverables && input.workflowStage !== "finalized",
    },
  ];

  const blockers = checks.filter((c) => c.blocking && !c.complete).map((c) => c.label);

  return {
    checks,
    readyForClientPackage: validationComplete && (evaluationApproved || isDeliverables),
    readyForFinalize: isDeliverables && packageApproved,
    blockers,
  };
}
