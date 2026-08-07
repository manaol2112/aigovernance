"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ASSESSMENT_JOURNEY_PHASES,
  isJourneyPhaseReachable,
  journeyPhaseIndex,
  resolveActiveJourneyPhase,
  type JourneyPhaseId,
} from "@/lib/assessment-journey";
import type { WorkshopWorkspacePhaseId } from "@/lib/workshop-workspace-phases";
import { cn } from "@/lib/utils";

type Props = {
  workflowStage: string;
  workspaceTab?: WorkshopWorkspacePhaseId;
  workspaceInitialized: boolean;
  disabled?: boolean;
  onNavigate: (phase: JourneyPhaseId) => void;
};

export function AssessmentJourneyRail({
  workflowStage,
  workspaceTab,
  workspaceInitialized,
  disabled,
  onNavigate,
}: Props) {
  const active = resolveActiveJourneyPhase(workflowStage, workspaceTab);
  const activeIdx = journeyPhaseIndex(active);

  return (
    <nav
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm [scrollbar-width:thin]"
      aria-label="Assessment journey"
    >
      <ol className="flex min-w-max gap-0.5">
        {ASSESSMENT_JOURNEY_PHASES.map((phase, i) => {
          const isActive = phase.id === active;
          const isPast = i < activeIdx;
          const reachable = isJourneyPhaseReachable(
            phase.id,
            workflowStage,
            workspaceInitialized,
            workspaceTab
          );

          return (
            <li key={phase.id}>
              <button
                type="button"
                disabled={disabled || !reachable}
                title={phase.subtitle}
                onClick={() => reachable && onNavigate(phase.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all sm:px-3",
                  isActive && "bg-slate-900 text-white shadow-sm",
                  !isActive && isPast && reachable && "bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
                  !isActive && !isPast && reachable && "text-slate-600 hover:bg-slate-50",
                  !reachable && "cursor-not-allowed text-slate-300"
                )}
              >
                {isPast && !isActive ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Circle
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive && "fill-white/20"
                    )}
                  />
                )}
                <span className="flex flex-col">
                  <span className="text-xs font-semibold leading-tight">{phase.label}</span>
                  <span
                    className={cn(
                      "hidden text-[10px] leading-tight sm:block",
                      isActive ? "text-slate-300" : "text-slate-400"
                    )}
                  >
                    {phase.subtitle}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type HeaderProps = {
  assessmentName: string;
  clientName: string | null;
  clientIndustry: string | null;
  frameworkCodes: string[];
  controlProgress: { confirmed: number; total: number };
  nextActionLabel?: string;
  nextActionHint?: string;
  onNextAction?: () => void;
  nextActionLoading?: boolean;
  pendingCheckpointCount?: number;
  deleteButton?: React.ReactNode;
  /** When false, hides the prominent next-step CTA (phase nav drives navigation). */
  showNextAction?: boolean;
};

export function AssessmentEngagementHeader({
  assessmentName,
  clientName,
  clientIndustry,
  frameworkCodes,
  controlProgress,
  nextActionLabel,
  nextActionHint,
  onNextAction,
  nextActionLoading,
  pendingCheckpointCount = 0,
  deleteButton,
  showNextAction = false,
}: HeaderProps) {
  const progressPct =
    controlProgress.total > 0
      ? Math.round((controlProgress.confirmed / controlProgress.total) * 100)
      : null;

  return (
    <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:px-6">
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-slate-500">
          <Link href="/assessments">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Assessments
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{assessmentName}</h1>
            {pendingCheckpointCount > 0 && (
              <Badge variant="warning" className="shrink-0">
                {pendingCheckpointCount} approval{pendingCheckpointCount === 1 ? "" : "s"} pending
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[clientName, clientIndustry].filter(Boolean).join(" · ")}
            {frameworkCodes.length > 0 && (
              <>
                {(clientName || clientIndustry) && " · "}
                {frameworkCodes.join(", ")}
              </>
            )}
          </p>
          {progressPct !== null && (
            <p className="mt-1.5 text-xs font-medium text-indigo-600">
              Validation: {controlProgress.confirmed} of {controlProgress.total} controls signed off ({progressPct}%)
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          {deleteButton}
          {showNextAction && onNextAction && nextActionLabel && (
            <div className="text-right">
              <Button size="sm" onClick={onNextAction} disabled={nextActionLoading} className="gap-1.5">
                {nextActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {nextActionLabel}
              </Button>
              {nextActionHint && (
                <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-slate-500">{nextActionHint}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
