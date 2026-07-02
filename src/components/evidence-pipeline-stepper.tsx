"use client";

import { ChevronRight } from "lucide-react";
import {
  activePipelineStepId,
  resolveEvidencePipelineSteps,
  type EvidencePipelineStepId,
  type PipelineStepStatus,
} from "@/lib/evidence-pipeline";
import { cn } from "@/lib/utils";

type Props = {
  readyCount: number;
  hasIndex: boolean;
  hasAnalysis: boolean;
  analysisStale: boolean;
  mappedControlCount: number;
  onStepClick?: (stepId: EvidencePipelineStepId) => void;
  compact?: boolean;
  className?: string;
};

const STATUS_STYLES: Record<PipelineStepStatus, { chip: string; badge: string; text: string }> = {
  complete: {
    chip: "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100",
    badge: "bg-indigo-600 text-white",
    text: "text-indigo-700",
  },
  active: {
    chip: "bg-slate-900 text-white shadow-md ring-1 ring-slate-700",
    badge: "bg-white text-slate-900",
    text: "text-white/90",
  },
  warning: {
    chip: "bg-amber-50 text-amber-950 ring-1 ring-amber-200",
    badge: "bg-amber-500 text-white",
    text: "text-amber-800",
  },
  upcoming: {
    chip: "bg-slate-50 text-slate-500 ring-1 ring-slate-100",
    badge: "bg-slate-200 text-slate-600",
    text: "text-slate-400",
  },
};

export function EvidencePipelineStepper({
  readyCount,
  hasIndex,
  hasAnalysis,
  analysisStale,
  mappedControlCount,
  onStepClick,
  compact = false,
  className,
}: Props) {
  const steps = resolveEvidencePipelineSteps({
    readyCount,
    hasIndex,
    hasAnalysis,
    analysisStale,
    mappedControlCount,
  });
  const activeId = activePipelineStepId(steps);

  return (
    <nav
      aria-label="Evidence pipeline"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm",
        className
      )}
    >
      {steps.map((step, i) => {
        const styles = STATUS_STYLES[step.status];
        const isActive = step.id === activeId;
        const clickable = Boolean(onStepClick);

        return (
          <div key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step.id)}
              title={step.detail}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-all",
                styles.chip,
                clickable && "hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                !clickable && "cursor-default",
                isActive && step.status !== "active" && "ring-2 ring-indigo-300"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  styles.badge
                )}
              >
                {step.status === "complete" ? "✓" : i + 1}
              </span>
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold", styles.text)}>{step.label}</p>
                {!compact && (
                  <p className={cn("text-[10px] leading-snug opacity-90", styles.text)}>{step.detail}</p>
                )}
              </div>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
