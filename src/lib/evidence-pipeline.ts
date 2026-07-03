export type EvidencePipelineStepId = "upload" | "index" | "analyze" | "review_mapping";

export type PipelineStepStatus = "complete" | "active" | "upcoming" | "warning";

export type EvidencePipelineStep = {
  id: EvidencePipelineStepId;
  label: string;
  detail: string;
  status: PipelineStepStatus;
};

export function resolveEvidencePipelineSteps(input: {
  readyCount: number;
  hasIndex: boolean;
  hasAnalysis: boolean;
  analysisStale: boolean;
  mappedControlCount: number;
}): EvidencePipelineStep[] {
  const { readyCount, hasIndex, hasAnalysis, analysisStale, mappedControlCount } = input;

  const uploadDone = readyCount > 0;
  const indexDone = hasIndex;
  const analyzeDone = hasAnalysis && !analysisStale;
  const reviewDone = analyzeDone && mappedControlCount > 0;

  const uploadStatus: PipelineStepStatus = uploadDone ? "complete" : "active";
  const indexStatus: PipelineStepStatus = indexDone
    ? "complete"
    : uploadDone
      ? "active"
      : "upcoming";
  const analyzeStatus: PipelineStepStatus = analyzeDone
    ? "complete"
    : analysisStale && hasAnalysis
      ? "warning"
      : indexDone || uploadDone
        ? "active"
        : "upcoming";
  const reviewStatus: PipelineStepStatus = reviewDone
    ? "active"
    : analyzeDone
      ? "upcoming"
      : "upcoming";

  return [
    {
      id: "upload",
      label: "Upload",
      detail: uploadDone
        ? `${readyCount} source${readyCount === 1 ? "" : "s"} ready`
        : "Add workshop notes, policies, or records",
      status: uploadStatus,
    },
    {
      id: "index",
      label: "Index",
      detail: indexDone ? "Sources vectorized" : uploadDone ? "Indexing on upload" : "Awaiting sources",
      status: indexStatus,
    },
    {
      id: "analyze",
      label: "Analyze",
      detail: analyzeDone
        ? `${mappedControlCount} control${mappedControlCount === 1 ? "" : "s"} mapped`
        : analysisStale
          ? "Re-analyze recommended"
          : hasAnalysis
            ? "Stale — re-run"
            : indexDone || uploadDone
              ? "Run governance analysis"
              : "Pending",
      status: analyzeStatus,
    },
    {
      id: "review_mapping",
      label: "Mapping",
      detail: mappedControlCount > 0
        ? "Findings, gaps & documentation"
        : "Awaiting analysis",
      status: reviewStatus,
    },
  ];
}

export function activePipelineStepId(steps: EvidencePipelineStep[]): EvidencePipelineStepId | null {
  const warning = steps.find((s) => s.status === "warning");
  if (warning) return warning.id;
  const active = steps.find((s) => s.status === "active");
  return active?.id ?? null;
}
