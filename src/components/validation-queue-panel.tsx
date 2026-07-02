"use client";

import { ArrowRight, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  VALIDATION_QUEUE_REASON_LABELS,
  validationQueueSummary,
  type ValidationQueueItem,
  type ValidationQueueReason,
} from "@/lib/validation-queue";
import { cn } from "@/lib/utils";

const REASON_BADGE: Record<ValidationQueueReason, string> = {
  not_assessed: "bg-slate-100 text-slate-700",
  missing_analysis: "bg-violet-100 text-violet-800",
  needs_revision: "bg-rose-100 text-rose-800",
  gap: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-900",
  ready_to_sign_off: "bg-emerald-100 text-emerald-800",
};

type Props = {
  queue: ValidationQueueItem[];
  selectedControlId: string | null;
  onSelectControl: (controlId: string) => void;
  className?: string;
};

export function ValidationQueuePanel({
  queue,
  selectedControlId,
  onSelectControl,
  className,
}: Props) {
  const summary = validationQueueSummary(queue);

  if (queue.length === 0) {
    return (
      <div
        className={cn(
          "border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-4",
          className
        )}
      >
        <div className="flex items-center gap-2 text-emerald-800">
          <ListOrdered className="h-4 w-4" />
          <p className="text-sm font-semibold">Validation queue complete</p>
        </div>
        <p className="mt-1 text-xs text-emerald-700/80">All controls are signed off.</p>
      </div>
    );
  }

  return (
    <div className={cn("border-b border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-white", className)}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-semibold text-slate-900">Validation queue</p>
              <Badge variant="secondary" className="text-[10px]">
                {summary.total} remaining
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Prioritized by coverage gaps, compliance status, and sign-off readiness.
            </p>
          </div>
          {summary.next && summary.next.controlId !== selectedControlId && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => onSelectControl(summary.next!.controlId)}
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="mt-3 flex max-h-44 flex-col gap-1.5 overflow-y-auto">
          {queue.slice(0, 8).map((item, index) => {
            const selected = item.controlId === selectedControlId;
            return (
              <button
                key={`${item.controlId}-${index}`}
                type="button"
                onClick={() => onSelectControl(item.controlId)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-all",
                  selected
                    ? "border-indigo-300 bg-white shadow-sm ring-1 ring-indigo-100"
                    : "border-transparent bg-white/60 hover:border-slate-200 hover:bg-white"
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-indigo-700">{item.code}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        REASON_BADGE[item.reason]
                      )}
                    >
                      {VALIDATION_QUEUE_REASON_LABELS[item.reason]}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-[11px] text-slate-600">{item.title}</span>
                </span>
              </button>
            );
          })}
        </div>

        {queue.length > 8 && (
          <p className="mt-2 text-[10px] text-slate-400">
            +{queue.length - 8} more in pillar navigator below
          </p>
        )}
      </div>
    </div>
  );
}
