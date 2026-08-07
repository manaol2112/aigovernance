"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Route,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DependencyCriticalPaths } from "@/components/dependency-critical-paths";
import { DependencyMaturityStack } from "@/components/dependency-maturity-stack";
import {
  buildCriticalPaths,
  buildPrerequisiteChain,
  buildSwimlaneGroups,
  getHighlightedIds,
} from "@/lib/governance-v2/dependency-graph-layout";
import type { DependencyGraph, DependencyNode } from "@/lib/governance-v2/types";
import { cn } from "@/lib/utils";

type ViewMode = "stack" | "paths";

export function GovernanceDependencyGraphView({ assessmentId }: { assessmentId: string }) {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("stack");
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/control-dependencies`);
      const data = await res.json();
      setGraph(data.graph ?? null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshGraph() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/control-dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rebuild" }),
      });
      const data = await res.json();
      setGraph(data.graph ?? null);
    } finally {
      setRefreshing(false);
    }
  }

  const swimlanes = useMemo(() => (graph ? buildSwimlaneGroups(graph) : []), [graph]);
  const criticalPaths = useMemo(() => (graph ? buildCriticalPaths(graph) : []), [graph]);
  const highlightedIds = useMemo(
    () => (graph ? getHighlightedIds(graph, selectedId) : new Set<string>()),
    [graph, selectedId]
  );

  const selectedNode = useMemo(
    () => graph?.nodes.find((n) => n.controlId === selectedId) ?? null,
    [graph, selectedId]
  );

  const prerequisiteChain = useMemo(
    () => (graph && selectedId ? buildPrerequisiteChain(graph, selectedId) : []),
    [graph, selectedId]
  );

  useEffect(() => {
    if (!graph || selectedId) return;
    const firstBlocked = graph.nodes.find((n) => n.blocked);
    if (firstBlocked) setSelectedId(firstBlocked.controlId);
    else if (graph.nodes[0]) setSelectedId(graph.nodes[0].controlId);
  }, [graph, selectedId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f6f7f9] text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Building dependency map…
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f6f7f9] p-8 text-center">
        <GitBranch className="h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-800">No controls in scope for dependency mapping</p>
        <p className="max-w-md text-sm text-slate-500">
          Complete scoping and run analysis in Evidence first — dependencies reflect your assessment
          posture and prerequisite chains.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f6f7f9]">
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Governance intelligence
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Control dependencies
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              See which controls must be effective before others can be relied upon. Fix foundation
              gaps first to unlock downstream requirements.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            disabled={refreshing}
            onClick={() => void refreshGraph()}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Effective" value={graph.stats.effective} tone="emerald" />
          <StatTile label="Partial" value={graph.stats.partial} tone="amber" />
          <StatTile label="Gaps" value={graph.stats.ineffective} tone="rose" />
          <StatTile label="Not assessed" value={graph.stats.notAssessed} tone="slate" />
          <StatTile label="Blocked" value={graph.stats.blocked} tone="red" />
          <StatTile label="Critical blockers" value={graph.stats.criticalBlockers} tone="indigo" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("stack")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "stack"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Maturity stack
              </button>
              <button
                type="button"
                onClick={() => setViewMode("paths")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "paths"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Route className="h-3.5 w-3.5" />
                Critical paths
              </button>
            </div>

            {viewMode === "stack" && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={showOnlyBlocked}
                  onChange={(e) => setShowOnlyBlocked(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Show blocked only
              </label>
            )}
          </div>

          {viewMode === "stack" ? (
            <DependencyMaturityStack
              lanes={swimlanes}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              onSelect={setSelectedId}
              showOnlyBlocked={showOnlyBlocked}
            />
          ) : (
            <DependencyCriticalPaths
              paths={criticalPaths}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-[380px]">
          {selectedNode ? (
            <>
              <NodeDetailPanel
                graph={graph}
                node={selectedNode}
                chain={prerequisiteChain}
                onSelectPrereq={setSelectedId}
              />
              <BlockedControlsList
                nodes={graph.nodes.filter((n) => n.blocked)}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Select a control to view its prerequisite chain
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "slate" | "red" | "indigo";
}) {
  const tones = {
    emerald: "border-emerald-100 bg-emerald-50/50",
    amber: "border-amber-100 bg-amber-50/50",
    rose: "border-rose-100 bg-rose-50/50",
    slate: "border-slate-200 bg-white",
    red: "border-red-100 bg-red-50/50",
    indigo: "border-indigo-100 bg-indigo-50/50",
  };
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", tones[tone])}>
      <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function NodeDetailPanel({
  graph,
  node,
  chain,
  onSelectPrereq,
}: {
  graph: DependencyGraph;
  node: DependencyNode;
  chain: DependencyNode[];
  onSelectPrereq: (id: string) => void;
}) {
  const downstreamImpacts = graph.edges
    .filter(
      (edge) =>
        edge.toControlId === node.controlId &&
        edge.relationType === "depends_on" &&
        edge.pathBlocked
    )
    .map((edge) => {
      const dependent = graph.nodes.find((n) => n.controlId === edge.fromControlId);
      if (!dependent) return null;
      return {
        controlId: dependent.controlId,
        controlCode: dependent.controlCode,
        controlTitle: dependent.controlTitle,
        readinessLabel: dependent.readinessLabel,
        rationale:
          edge.rationale?.trim() ||
          `${dependent.controlCode} depends on ${node.controlCode} before it can be relied upon.`,
        whyFixFirst: `${dependent.controlCode} (${dependent.controlTitle}) remains blocked until ${node.controlCode} is effective, so remediation sequencing should start here before downstream controls are validated or closed.`,
        impactScore: edge.impactScore,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => b.impactScore - a.impactScore || a.controlCode.localeCompare(b.controlCode));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className={cn(
          "border-b px-4 py-4",
          node.blocked ? "border-rose-100 bg-rose-50/60" : "border-emerald-100 bg-emerald-50/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-bold text-indigo-700">{node.controlCode}</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">{node.controlTitle}</h3>
          </div>
          {node.blocked ? (
            <Badge variant="outline" className="border-rose-200 bg-white text-rose-700">
              <Lock className="mr-1 h-3 w-3" />
              Blocked
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700">
              <Unlock className="mr-1 h-3 w-3" />
              Unlocked
            </Badge>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-600">{node.readinessLabel}</p>
      </div>

      <div className="space-y-4 p-4">
        {chain.length > 1 && (
          <div>
            <p className="mb-3 text-xs font-semibold text-slate-700">Prerequisite chain</p>
            <p className="mb-3 text-[11px] text-slate-500">
              Read top to bottom — each step must be effective before the next can be relied upon.
            </p>
            <ol className="space-y-0">
              {chain.map((step, idx) => {
                const isTarget = step.controlId === node.controlId;
                const isLast = idx === chain.length - 1;
                const effective = step.readiness === "effective";

                return (
                  <li key={step.controlId} className="relative">
                    <button
                      type="button"
                      onClick={() => onSelectPrereq(step.controlId)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-colors",
                        isTarget
                          ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                          : effective
                            ? "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50"
                            : "border-rose-100 bg-rose-50/50 hover:bg-rose-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-indigo-700">{step.controlCode}</span>
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            effective ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          {step.readinessLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-700">{step.controlTitle}</p>
                      {isTarget && (
                        <p className="mt-1 text-[10px] font-medium text-indigo-600">Selected control</p>
                      )}
                    </button>
                    {!isLast && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {node.blockingReasons.length > 0 && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
            <p className="flex items-center gap-1 text-xs font-semibold text-rose-800">
              <AlertTriangle className="h-3.5 w-3.5" />
              What to fix first
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-rose-700">
              These prerequisite controls are preventing this control from being treated as reliable.
              Address them first, then return to this control for downstream remediation.
            </p>
            <ul className="mt-3 space-y-2">
              {node.blockingReasons.map((b) => (
                <li key={b.controlCode}>
                  <button
                    type="button"
                    onClick={() => onSelectPrereq(b.controlId)}
                    className="w-full rounded-lg border border-rose-200 bg-white/80 p-3 text-left transition-colors hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-rose-800">{b.controlCode}</p>
                        <p className="text-[11px] font-medium text-slate-800">{b.controlTitle}</p>
                      </div>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                        {b.readiness}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-700">{b.rationale}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-rose-700">{b.whyFixFirst}</p>
                    <p className="mt-2 text-[10px] font-medium text-rose-800">Recommended first step: {b.action}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {downstreamImpacts.length > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
            <p className="flex items-center gap-1 text-xs font-semibold text-indigo-800">
              <Route className="h-3.5 w-3.5" />
              Why this control is critical first
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-indigo-700">
              This control is a prerequisite for {downstreamImpacts.length} downstream control
              {downstreamImpacts.length === 1 ? "" : "s"}. Fixing it first unlocks later controls that
              currently inherit the same dependency weakness.
            </p>
            <ul className="mt-3 space-y-2">
              {downstreamImpacts.map((impact) => (
                <li key={impact.controlId}>
                  <button
                    type="button"
                    onClick={() => onSelectPrereq(impact.controlId)}
                    className="w-full rounded-lg border border-indigo-200 bg-white/80 p-3 text-left transition-colors hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-indigo-800">
                          {impact.controlCode}
                        </p>
                        <p className="text-[11px] font-medium text-slate-800">{impact.controlTitle}</p>
                      </div>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                        {impact.readinessLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-700">{impact.rationale}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-indigo-700">{impact.whyFixFirst}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockedControlsList({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: DependencyNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <Unlock className="h-4 w-4" />
          No blocked controls
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          All prerequisite paths are open for controls in scope.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Blocked controls ({nodes.length})</p>
        <p className="text-xs text-slate-500">Prioritize these after fixing their prerequisites</p>
      </div>
      <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto [scrollbar-width:thin]">
        {nodes.map((n) => (
          <li key={n.controlId}>
            <button
              type="button"
              onClick={() => onSelect(n.controlId)}
              className={cn(
                "w-full px-4 py-3 text-left transition-colors hover:bg-slate-50",
                n.controlId === selectedId && "bg-indigo-50"
              )}
            >
              <p className="font-mono text-[11px] font-bold text-indigo-700">{n.controlCode}</p>
              <p className="text-xs text-slate-700">{n.controlTitle}</p>
              {n.blockingReasons[0] && (
                <>
                  <p className="mt-1 text-[10px] font-medium text-rose-600">
                    Blocked by {n.blockingReasons[0].controlCode}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                    {n.blockingReasons[0].rationale}
                  </p>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
