"use client";

import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resolveEngagementReadiness,
  type ReadinessCheck,
} from "@/lib/engagement-readiness";
import { cn } from "@/lib/utils";

type Props = {
  controlConfirmed: number;
  controlTotal: number;
  analysisStale?: boolean;
  hasAnalysis?: boolean;
  evaluationReviewApproved?: boolean;
  workflowStage?: string;
  deliverableCheckpointStatus?: string;
  onGoToReview?: () => void;
  onGoToEvidence?: () => void;
  className?: string;
};

function CheckRow({ check }: { check: ReadinessCheck }) {
  const Icon = check.complete ? CheckCircle2 : check.blocking ? AlertTriangle : Circle;
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          check.complete && "text-emerald-600",
          !check.complete && check.blocking && "text-amber-600",
          !check.complete && !check.blocking && "text-slate-300"
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{check.label}</p>
        <p className="text-xs text-slate-500">{check.detail}</p>
      </div>
    </li>
  );
}

export function PreviewReadinessPanel({
  controlConfirmed,
  controlTotal,
  analysisStale,
  hasAnalysis,
  evaluationReviewApproved,
  workflowStage,
  deliverableCheckpointStatus,
  onGoToReview,
  onGoToEvidence,
  className,
}: Props) {
  const readiness = resolveEngagementReadiness({
    controlConfirmed,
    controlTotal,
    analysisStale,
    hasAnalysis,
    evaluationReviewApproved,
    workflowStage,
    deliverableCheckpointStatus,
  });

  const showValidationCta =
    !readiness.checks.find((c) => c.id === "validation_complete")?.complete && onGoToReview;
  const showEvidenceCta =
    !readiness.checks.find((c) => c.id === "analysis_current")?.complete && onGoToEvidence;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white shadow-sm",
        className
      )}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Package readiness
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              {readiness.readyForFinalize
                ? "Ready to close engagement"
                : readiness.readyForClientPackage
                  ? "Ready for client package review"
                  : "Complete remaining items"}
            </h3>
            {readiness.blockers.length > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {readiness.blockers.length} blocker{readiness.blockers.length === 1 ? "" : "s"} remaining
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {showEvidenceCta && (
              <Button size="sm" variant="outline" onClick={onGoToEvidence}>
                Go to evidence
              </Button>
            )}
            {showValidationCta && (
              <Button size="sm" onClick={onGoToReview}>
                Complete validation
              </Button>
            )}
          </div>
        </div>
      </div>
      <ul className="grid gap-2 p-4 sm:grid-cols-2">
        {readiness.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>
    </section>
  );
}
