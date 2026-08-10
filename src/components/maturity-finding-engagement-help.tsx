"use client";

import { Compass, Layers, Target } from "lucide-react";
import type { FindingEngagementGuide } from "@/lib/maturity-survey-analysis";
import { cn } from "@/lib/utils";

const STEP_ICONS = [Compass, Layers, Target] as const;

export function MaturityFindingEngagementHelp({
  guide,
  compact = false,
}: {
  guide: FindingEngagementGuide;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-t border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-white",
        compact ? "px-4 py-4" : "px-5 py-5"
      )}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          {guide.headline}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{guide.intro}</p>
      </div>

      <ol className="mt-4 space-y-3">
        {guide.actions.map((action, i) => {
          const Icon = STEP_ICONS[i] ?? Target;
          return (
            <li key={`${action.title}-${i}`} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <span className="text-[10px] font-bold">{i + 1}</span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  {action.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{action.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        These are typical high-level moves we use with clients on this type of gap — tailored further
        once we understand your operating context.
      </p>
    </div>
  );
}
