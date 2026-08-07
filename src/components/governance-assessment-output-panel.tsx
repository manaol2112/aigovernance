"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, Loader2, Play, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { GovernanceScoreResult } from "@/lib/governance-v2/types";

export function GovernanceAssessmentOutputPanel({ assessmentId }: { assessmentId: string }) {
  const [scores, setScores] = useState<GovernanceScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/intelligence`);
      const data = await res.json();
      setScores(data.scores ?? null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPipeline() {
    setRunning(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pipeline failed");
      setScores(data.scores);
      toast("Governance intelligence pipeline complete.", { variant: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", { variant: "error" });
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f6f7f9] text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Computing scores…
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
              Assessment scores
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Multi-dimensional maturity with risk- and confidence-adjusted views.
            </p>
          </div>
          <Button
            onClick={() => void runPipeline()}
            disabled={running}
            className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run intelligence pipeline
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          {scores ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <ScoreCard label="Overall maturity" value={scores.overallMaturityPct} icon={Gauge} />
                <ScoreCard label="Risk-adjusted" value={scores.riskAdjustedMaturityPct} icon={TrendingUp} />
                <ScoreCard label="Confidence-adjusted" value={scores.confidenceAdjustedMaturityPct} icon={Gauge} />
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Scoring dimensions</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(scores.dimensions).map(([key, val]) => (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="capitalize text-slate-600">{key.replace(/([A-Z])/g, " $1")}</span>
                        <span className="font-bold tabular-nums">{val}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-900">By pillar</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {scores.byPillar.map((p) => (
                    <div key={p.pillarId} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm font-medium text-slate-900">{p.pillarLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Maturity {p.maturityPct}% · Confidence {p.confidencePct}%
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <Gauge className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-800">No scores yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Run the intelligence pipeline to generate multi-dimensional maturity scores.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-lg">
      <Icon className="h-5 w-5 text-indigo-300" />
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}%</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}
