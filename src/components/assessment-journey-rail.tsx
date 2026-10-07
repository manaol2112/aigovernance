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
  /** Dense single-row chrome for working stages (workshop / deliver). */
  compact = false,
}: HeaderProps & { compact?: boolean }) {
  const meta = [
    clientName,
    clientIndustry,
    frameworkCodes.length > 0 ? frameworkCodes.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (compact) {
    return (
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#E3E3E3] pb-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 shrink-0 px-2 text-[#666666] hover:text-black"
        >
          <Link href="/assessments">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Assessments</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight text-black">
              {assessmentName}
            </h1>
            {pendingCheckpointCount > 0 && (
              <Badge variant="warning" className="shrink-0 text-[10px]">
                {pendingCheckpointCount} pending
              </Badge>
            )}
          </div>
          {meta ? (
            <p className="truncate text-[11px] text-[#666666]">{meta}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {deleteButton}
          {showNextAction && onNextAction && nextActionLabel && (
            <Button size="sm" onClick={onNextAction} disabled={nextActionLoading} className="h-7 gap-1.5 text-xs">
              {nextActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {nextActionLabel}
            </Button>
          )}
        </div>
      </header>
    );
  }

  const progressPct =
    controlProgress.total > 0
      ? Math.round((controlProgress.confirmed / controlProgress.total) * 100)
      : null;

  return (
    <header className="rounded-lg border border-[#E3E3E3] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 text-[#666666] hover:text-black"
            >
              <Link href="/assessments">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Assessments
              </Link>
            </Button>
            {pendingCheckpointCount > 0 && (
              <Badge variant="warning" className="shrink-0 text-[10px]">
                {pendingCheckpointCount} approval{pendingCheckpointCount === 1 ? "" : "s"} pending
              </Badge>
            )}
          </div>
          <h1 className="mt-1 truncate text-xl font-light tracking-tight text-black">
            {assessmentName}
          </h1>
          <p className="mt-0.5 truncate text-sm text-[#666666]">
            {meta}
            {progressPct !== null ? (
              <span className="ml-2 font-medium text-[#046A38]">· {progressPct}% validated</span>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {deleteButton}
          {showNextAction && onNextAction && nextActionLabel && (
            <div className="text-right">
              <Button size="sm" onClick={onNextAction} disabled={nextActionLoading} className="gap-1.5">
                {nextActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {nextActionLabel}
              </Button>
              {nextActionHint && (
                <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-[#666666]">{nextActionHint}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
