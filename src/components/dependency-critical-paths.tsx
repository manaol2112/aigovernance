"use client";

import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import type { CriticalPath } from "@/lib/governance-v2/dependency-graph-layout";
import { cn } from "@/lib/utils";

const STEP_STYLES = {
  effective: "border-emerald-200 bg-emerald-50",
  partial: "border-amber-200 bg-amber-50",
  ineffective: "border-rose-200 bg-rose-50",
  not_assessed: "border-slate-200 bg-slate-50",
  out_of_scope: "border-dashed border-slate-200 bg-white opacity-50",
} as const;

type Props = {
  paths: CriticalPath[];
  selectedId: string | null;
  onSelect: (controlId: string) => void;
};

export function DependencyCriticalPaths({ paths, selectedId, onSelect }: Props) {
  const visiblePaths = paths.filter((p) => p.steps.some((s) => s.inScope));

  if (visiblePaths.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No canonical dependency paths include controls in your current assessment scope.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Critical dependency paths</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Follow left to right — each arrow means &ldquo;requires effective prerequisite.&rdquo; Red
          steps block everything to their right on that path.
        </p>
      </div>

      {visiblePaths.map((path) => (
        <div
          key={path.id}
          className={cn(
            "overflow-hidden rounded-2xl border bg-white shadow-sm",
            path.pathOpen ? "border-emerald-200" : "border-slate-200"
          )}
        >
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3",
              path.pathOpen ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/80"
            )}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{path.label}</p>
              <p className="text-xs text-slate-500">{path.description}</p>
            </div>
            {path.pathOpen ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Path open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                <Lock className="h-3.5 w-3.5" />
                {path.blockedCount} step{path.blockedCount === 1 ? "" : "s"} need attention
              </span>
            )}
          </div>

          <div className="overflow-x-auto p-4 [scrollbar-width:thin]">
            <div className="flex min-w-min items-stretch gap-0">
              {path.steps.map((step, idx) => {
                const isLast = idx === path.steps.length - 1;
                const readiness =
                  step.readiness === "out_of_scope" ? "out_of_scope" : step.readiness;
                const selected = step.controlId === selectedId;

                return (
                  <div key={`${path.id}-${step.controlCode}`} className="flex items-center">
                    <button
                      type="button"
                      disabled={!step.inScope || !step.controlId}
                      onClick={() => step.controlId && onSelect(step.controlId)}
                      className={cn(
                        "w-[150px] rounded-xl border p-3 text-left transition-all",
                        STEP_STYLES[readiness],
                        step.inScope && step.controlId && "hover:shadow-md cursor-pointer",
                        !step.inScope && "cursor-default",
                        selected && "ring-2 ring-indigo-300"
                      )}
                    >
                      <p className="font-mono text-[10px] font-bold text-indigo-700">
                        {step.controlCode.replace("CTRL-", "")}
                      </p>
                      <p className="mt-1 line-clamp-2 min-h-[2rem] text-[11px] font-medium leading-snug text-slate-800">
                        {step.inScope ? step.controlTitle : "Out of scope"}
                      </p>
                      <p className="mt-2 text-[10px] text-slate-600">{step.readinessLabel}</p>
                    </button>

                    {!isLast && (
                      <div className="flex w-8 shrink-0 flex-col items-center justify-center px-0.5">
                        <ArrowRight
                          className={cn(
                            "h-4 w-4",
                            step.inScope &&
                              step.readiness !== "effective" &&
                              path.steps[idx + 1]?.inScope
                              ? "text-rose-400"
                              : "text-slate-300"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
