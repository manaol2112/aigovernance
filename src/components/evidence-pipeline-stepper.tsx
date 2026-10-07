"use client";

import { Check, ChevronRight } from "lucide-react";
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
    chip: "bg-[#EEF7E0] text-[#046A38]",
    badge: "bg-[#86BC25] text-black",
    text: "text-[#046A38]",
  },
  active: {
    chip: "bg-black text-white",
    badge: "bg-white text-black",
    text: "text-white/85",
  },
  warning: {
    chip: "bg-amber-50 text-amber-950",
    badge: "bg-amber-500 text-white",
    text: "text-amber-800",
  },
  upcoming: {
    chip: "bg-[#FAFAFA] text-[#666666]",
    badge: "bg-[#E3E3E3] text-[#53565A]",
    text: "text-[#767676]",
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
        "flex min-w-0 flex-wrap items-center gap-1",
        className
      )}
    >
      {steps.map((step, i) => {
        const styles = STATUS_STYLES[step.status];
        const isActive = step.id === activeId;
        const clickable = Boolean(onStepClick);

        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step.id)}
              title={step.detail}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
                styles.chip,
                clickable && "hover:brightness-[0.98]",
                !clickable && "cursor-default",
                isActive && step.status !== "active" && "ring-1 ring-black/20"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                  styles.badge
                )}
              >
                {step.status === "complete" ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[11px] font-semibold leading-tight", styles.text)}>
                  {step.label}
                </span>
                {!compact && (
                  <span className={cn("mt-0.5 block text-[10px] leading-snug", styles.text)}>
                    {step.detail}
                  </span>
                )}
              </span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-[#D0D0CE] sm:block" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
