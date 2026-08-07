"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  description: string;
};

type Props = {
  steps: Step[];
  currentStepId: string;
  className?: string;
};

export function SetupWizardStepper({ steps, currentStepId, className }: Props) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <nav
      aria-label="Setup progress"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm",
        className
      )}
    >
      {steps.map((step, i) => {
        const isPast = i < currentIndex;
        const isCurrent = step.id === currentStepId;
        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2",
                isCurrent && "bg-slate-900 text-white",
                isPast && "bg-emerald-50 text-emerald-900",
                !isCurrent && !isPast && "bg-slate-50 text-slate-500"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  isCurrent && "bg-white text-slate-900",
                  isPast && "bg-emerald-600 text-white",
                  !isCurrent && !isPast && "bg-slate-200 text-slate-600"
                )}
              >
                {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{step.label}</p>
                <p className="hidden truncate text-[10px] opacity-80 sm:block">{step.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
