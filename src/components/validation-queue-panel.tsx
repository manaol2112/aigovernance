"use client";

import { ArrowRight, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  validationQueueSummary,
  type ValidationQueueItem,
} from "@/lib/validation-queue";
import { cn } from "@/lib/utils";

type Props = {
  queue: ValidationQueueItem[];
  selectedControlId: string | null;
  onSelectControl: (controlId: string) => void;
  className?: string;
};

/** Compact queue strip — full list lives in the pillar sidebar below. */
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
          "flex items-center gap-2 border-b border-[#86BC25]/35 bg-[#EEF7E0]/40 px-3 py-1.5",
          className
        )}
      >
        <ListOrdered className="h-3.5 w-3.5 text-[#046A38]" />
        <p className="text-[11px] font-semibold text-[#046A38]">Queue clear — all signed off</p>
      </div>
    );
  }

  const next = summary.next;
  const showNext = next && next.controlId !== selectedControlId;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-[#E3E3E3] bg-[#FAFAFA] px-3 py-1.5",
        className
      )}
    >
      <div className="min-w-0 flex items-center gap-2">
        <ListOrdered className="h-3.5 w-3.5 shrink-0 text-[#53565A]" />
        <p className="truncate text-[11px] text-[#666666]">
          <span className="font-semibold tabular-nums text-black">{summary.total}</span> in queue
          {next ? (
            <>
              {" · next "}
              <span className="font-mono font-semibold text-black">{next.code}</span>
            </>
          ) : null}
        </p>
      </div>
      {showNext ? (
        <Button
          size="sm"
          variant="outline"
          className="h-6 shrink-0 gap-1 px-2 text-[11px]"
          onClick={() => onSelectControl(next.controlId)}
        >
          Next
          <ArrowRight className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}
