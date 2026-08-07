"use client";

import { ChevronDown, Lock, Unlock } from "lucide-react";
import type { SwimlaneGroup } from "@/lib/governance-v2/dependency-graph-layout";
import type { DependencyNode } from "@/lib/governance-v2/types";
import { cn } from "@/lib/utils";

const READINESS_STYLES: Record<
  DependencyNode["readiness"],
  { ring: string; bg: string; dot: string; label: string }
> = {
  effective: {
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    label: "Effective",
  },
  partial: {
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    label: "Partial",
  },
  ineffective: {
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    dot: "bg-rose-500",
    label: "Gap",
  },
  not_assessed: {
    ring: "ring-slate-200",
    bg: "bg-slate-50",
    dot: "bg-slate-400",
    label: "Not assessed",
  },
};

type Props = {
  lanes: SwimlaneGroup[];
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (controlId: string) => void;
  showOnlyBlocked?: boolean;
};

export function DependencyMaturityStack({
  lanes,
  selectedId,
  highlightedIds,
  onSelect,
  showOnlyBlocked = false,
}: Props) {
  const hasSelection = highlightedIds.size > 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">Maturity stack</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Read top to bottom — each row is a governance maturity stage. Controls in lower rows
          typically depend on effective controls above. Select a control to see its prerequisites.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {lanes.map((lane, laneIdx) => {
          const nodes = showOnlyBlocked ? lane.nodes.filter((n) => n.blocked) : lane.nodes;
          if (nodes.length === 0) return null;

          return (
            <div key={lane.layerIndex} className="relative">
              {laneIdx > 0 && (
                <div className="pointer-events-none absolute -top-3 left-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
              )}

              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4">
                <div className="w-full shrink-0 sm:w-44">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                      Layer {lane.layerIndex}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{lane.layerLabel}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
                      {lane.layerDescription}
                    </p>
                    <p className="mt-2 text-[10px] font-medium text-slate-400">
                      {nodes.length} control{nodes.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  <div className="flex gap-3">
                    {nodes.map((node) => (
                      <ControlCard
                        key={node.controlId}
                        node={node}
                        selected={node.controlId === selectedId}
                        dimmed={hasSelection && !highlightedIds.has(node.controlId)}
                        onSelect={() => onSelect(node.controlId)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ControlCard({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: DependencyNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const style = READINESS_STYLES[node.readiness];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-[168px] shrink-0 rounded-xl border bg-white p-3 text-left shadow-sm transition-all",
        "hover:border-indigo-200 hover:shadow-md",
        selected && "border-indigo-400 ring-2 ring-indigo-200",
        !selected && "border-slate-200",
        dimmed && "opacity-40",
        node.blocked && !selected && "border-rose-200"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-[11px] font-bold text-indigo-700">{node.controlCode}</span>
        {node.blocked ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-label="Blocked" />
        ) : (
          <Unlock className="h-3.5 w-3.5 shrink-0 text-emerald-500 opacity-60" aria-label="Unlocked" />
        )}
      </div>

      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-medium leading-snug text-slate-800">
        {node.controlTitle}
      </p>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", style.dot)} />
        <span className="text-[10px] font-medium text-slate-600">{style.label}</span>
      </div>

      {node.blockingReasons.length > 0 && (
        <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-rose-600">
          Needs: {node.blockingReasons.map((b) => b.controlCode.replace("CTRL-", "")).join(", ")}
        </p>
      )}
    </button>
  );
}
