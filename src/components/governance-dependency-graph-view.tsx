"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, Loader2, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DependencyGraph } from "@/lib/governance-v2/types";

export function GovernanceDependencyGraphView({ assessmentId }: { assessmentId: string }) {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Building dependency graph…
      </div>
    );
  }

  if (!graph) return null;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Control dependency graph</h2>
        <p className="text-sm text-slate-500">
          Blocked and unlocked paths — prerequisites must be effective before dependent controls.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Controls in graph" value={graph.nodes.length} />
        <StatCard label="Blocked" value={graph.blockedControlIds.length} tone="red" />
        <StatCard label="Dependencies" value={graph.edges.length} tone="indigo" />
      </div>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Lock className="h-4 w-4 text-red-500" />
          Blocked controls
        </h3>
        {graph.blockedControlIds.length === 0 ? (
          <p className="text-sm text-emerald-600">No blocked controls — prerequisites are satisfied.</p>
        ) : (
          <div className="space-y-2">
            {graph.nodes
              .filter((n) => n.blocked)
              .map((n) => (
                <div
                  key={n.controlId}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/60 px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-xs text-red-700">{n.controlCode}</p>
                    <p className="text-sm font-medium text-slate-900">{n.controlTitle}</p>
                  </div>
                  <span className="text-xs text-red-600">Blocked</span>
                </div>
              ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Unlock className="h-4 w-4 text-emerald-600" />
          Unlock paths
        </h3>
        <div className="space-y-2">
          {graph.unlockPaths.map((p) => {
            const node = graph.nodes.find((n) => n.controlId === p.controlId);
            return (
              <div key={p.controlId} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-medium text-slate-900">
                  {node?.controlCode} — {node?.controlTitle}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <GitBranch className="h-3 w-3" />
                  Requires: {p.path.length ? p.path.join(" → ") : "no prerequisites in scope"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-slate-900">Dependency edges</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">Relation</th>
                <th className="px-4 py-2">To (prerequisite)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {graph.edges.slice(0, 30).map((e) => {
                const from = graph.nodes.find((n) => n.controlId === e.fromControlId);
                const to = graph.nodes.find((n) => n.controlId === e.toControlId);
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-2 font-mono text-xs">{from?.controlCode}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{e.relationType}</td>
                    <td className="px-4 py-2 font-mono text-xs">{to?.controlCode}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "red" | "indigo";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "red" && "border-red-100 bg-red-50/50",
        tone === "indigo" && "border-indigo-100 bg-indigo-50/50",
        tone === "slate" && "border-slate-200 bg-white"
      )}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
