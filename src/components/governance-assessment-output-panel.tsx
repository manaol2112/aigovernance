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
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Computing scores…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Governance assessment output</h2>
          <p className="text-sm text-slate-500">
            Multi-dimensional maturity with risk- and confidence-adjusted views.
          </p>
        </div>
        <Button onClick={() => void runPipeline()} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run intelligence pipeline
        </Button>
      </div>

      {scores && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreCard label="Overall maturity" value={scores.overallMaturityPct} icon={Gauge} />
            <ScoreCard label="Risk-adjusted" value={scores.riskAdjustedMaturityPct} icon={TrendingUp} />
            <ScoreCard label="Confidence-adjusted" value={scores.confidenceAdjustedMaturityPct} icon={Gauge} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
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
                <div key={p.pillarId} className="rounded-lg border border-slate-200 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{p.pillarLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Maturity {p.maturityPct}% · Confidence {p.confidencePct}%
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
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
