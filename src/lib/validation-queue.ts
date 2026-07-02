import { isMalformedFindingText } from "@/lib/capture-finding-format";

export type ValidationQueueReason =
  | "not_assessed"
  | "missing_analysis"
  | "needs_revision"
  | "gap"
  | "partial"
  | "ready_to_sign_off";

export type ValidationQueueItem = {
  controlId: string;
  code: string;
  title: string;
  pillarLabel: string;
  reason: ValidationQueueReason;
  priority: number;
  complianceStatus: string;
  evalStatus: string;
};

export const VALIDATION_QUEUE_REASON_LABELS: Record<ValidationQueueReason, string> = {
  not_assessed: "Not assessed",
  missing_analysis: "Missing analysis",
  needs_revision: "Needs revision",
  gap: "Gap finding",
  partial: "Partial alignment",
  ready_to_sign_off: "Ready to sign off",
};

type EvalInput = {
  status: string;
  complianceStatus: string;
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  aiGenerated: boolean;
};

type ControlInput = {
  id: string;
  code: string;
  title: string;
  pillarLabel: string;
};

function hasUsableFindings(ev: EvalInput): boolean {
  const inPlace = ev.inPlaceFindings?.trim() ?? "";
  return (
    !!inPlace &&
    !isMalformedFindingText(inPlace) &&
    !isMalformedFindingText(ev.gapFindings) &&
    !isMalformedFindingText(ev.recommendations)
  );
}

function queuePriority(ev: EvalInput): { reason: ValidationQueueReason; priority: number } | null {
  if (ev.status === "human_confirmed") return null;

  if (ev.status === "rejected") {
    return { reason: "needs_revision", priority: 20 };
  }

  if (!hasUsableFindings(ev)) {
    if (ev.status === "pending" || !ev.aiGenerated) {
      return { reason: "missing_analysis", priority: 10 };
    }
    if (ev.complianceStatus === "not_assessed") {
      return { reason: "not_assessed", priority: 15 };
    }
    return { reason: "missing_analysis", priority: 12 };
  }

  if (ev.complianceStatus === "not_assessed") {
    return { reason: "not_assessed", priority: 30 };
  }
  if (ev.complianceStatus === "gap") {
    return { reason: "gap", priority: 40 };
  }
  if (ev.complianceStatus === "partial") {
    return { reason: "partial", priority: 50 };
  }

  if (ev.status === "ai_draft" || ev.status === "pending") {
    return { reason: "ready_to_sign_off", priority: 60 };
  }

  return { reason: "ready_to_sign_off", priority: 70 };
}

export function buildValidationQueue(
  controls: ControlInput[],
  evalByControlId: Map<string, EvalInput>
): ValidationQueueItem[] {
  const items: ValidationQueueItem[] = [];
  const seen = new Set<string>();

  for (const control of controls) {
    if (seen.has(control.id)) continue;
    seen.add(control.id);

    const ev = evalByControlId.get(control.id);
    if (!ev) {
      items.push({
        controlId: control.id,
        code: control.code,
        title: control.title,
        pillarLabel: control.pillarLabel,
        reason: "missing_analysis",
        priority: 5,
        complianceStatus: "not_assessed",
        evalStatus: "pending",
      });
      continue;
    }

    const scored = queuePriority(ev);
    if (!scored) continue;

    items.push({
      controlId: control.id,
      code: control.code,
      title: control.title,
      pillarLabel: control.pillarLabel,
      reason: scored.reason,
      priority: scored.priority,
      complianceStatus: ev.complianceStatus,
      evalStatus: ev.status,
    });
  }

  return items.sort(
    (a, b) =>
      a.priority - b.priority ||
      a.code.localeCompare(b.code)
  );
}

export function validationQueueSummary(queue: ValidationQueueItem[]) {
  const byReason = new Map<ValidationQueueReason, number>();
  for (const item of queue) {
    byReason.set(item.reason, (byReason.get(item.reason) ?? 0) + 1);
  }
  return {
    total: queue.length,
    next: queue[0] ?? null,
    byReason,
  };
}
