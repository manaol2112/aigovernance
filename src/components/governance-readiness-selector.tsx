"use client";

import { Compass, ShieldCheck } from "lucide-react";
import { GOVERNANCE_READINESS_OPTIONS, type UseCaseIntakeMode } from "@/lib/use-case-intake";
import { cn } from "@/lib/utils";

const MODE_META: Record<
  UseCaseIntakeMode,
  { icon: typeof Compass; accent: string; ring: string; bg: string; dot: string }
> = {
  discovery: {
    icon: Compass,
    accent: "text-amber-700",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  established: {
    icon: ShieldCheck,
    accent: "text-indigo-700",
    ring: "ring-indigo-200",
    bg: "bg-indigo-50",
    dot: "bg-indigo-500",
  },
};

type Props = {
  value: UseCaseIntakeMode;
  onChange: (mode: UseCaseIntakeMode) => void;
  compact?: boolean;
};

export function GovernanceReadinessSelector({ value, onChange, compact }: Props) {
  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2")}>
      {GOVERNANCE_READINESS_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        const meta = MODE_META[opt.value];
        const Icon = meta.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border text-left transition-all duration-200",
              compact ? "px-4 py-3" : "px-5 py-4",
              selected
                ? cn("border-transparent bg-white shadow-md ring-2", meta.ring)
                : "border-slate-200/80 bg-white/80 hover:border-slate-300 hover:bg-white hover:shadow-sm"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-100",
                  selected ? meta.bg : "bg-slate-50 group-hover:bg-slate-100"
                )}
              >
                <Icon className={cn("h-5 w-5", selected ? meta.accent : "text-slate-500")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                {!compact && (
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{opt.description}</p>
                )}
              </div>
              {selected && (
                <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
