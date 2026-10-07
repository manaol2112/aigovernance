"use client";

import { cn } from "@/lib/utils";
import { packPillarDescriptionAny } from "@/lib/pack-pillar-catalog";

type Props = {
  index: number;
  totalAreas: number;
  pillarId: string;
  pillarLabel: string;
  answeredCount: number;
  totalCount: number;
};

export function MaturityPackPillarSectionHeader({
  index,
  totalAreas,
  pillarId,
  pillarLabel,
  answeredCount,
  totalCount,
}: Props) {
  const complete = totalCount > 0 && answeredCount === totalCount;
  const fill = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const description = packPillarDescriptionAny(pillarId);

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="relative flex gap-0">
        {/* Index rail */}
        <div className="relative flex w-14 shrink-0 flex-col items-center justify-center border-r border-slate-100 bg-[#f7f7f7] py-4 sm:w-16">
          <span
            aria-hidden
            className="absolute bottom-3 left-0 top-3 w-0.5 bg-[var(--theme-brand)]"
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Area
          </span>
          <span className="mt-0.5 text-xl font-light tabular-nums tracking-tight text-slate-900 sm:text-2xl">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Title + progress */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {index + 1} of {totalAreas}
            </p>
            <h2 className="mt-0.5 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-[17px]">
              {pillarLabel}
            </h2>
            {description && (
              <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-500">
                {description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
            <p
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                complete ? "text-slate-800" : "text-slate-500"
              )}
            >
              {answeredCount}
              <span className="font-normal text-slate-400"> / {totalCount}</span>
            </p>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  complete ? "bg-slate-900" : "bg-[var(--theme-brand)]"
                )}
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
