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
      <div className="flex h-full items-center justify-center bg-[#FAFAFA]/40 text-sm text-[#666666]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Computing scores…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFAFA]/40">
      <header className="flex shrink-0 flex-col gap-2 border-b border-[#E3E3E3] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-brand)]">
            Intelligence
          </p>
          <h2 className="text-sm font-semibold text-black">Assessment scores</h2>
        </div>
        <Button
          size="sm"
          onClick={() => void runPipeline()}
          disabled={running}
          className="h-7 shrink-0 gap-1.5 text-xs"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run pipeline
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 [scrollbar-width:thin]">
        <div className="space-y-3">
          {scores ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <ScoreCard label="Overall maturity" value={scores.overallMaturityPct} icon={Gauge} />
                <ScoreCard label="Risk-adjusted" value={scores.riskAdjustedMaturityPct} icon={TrendingUp} />
                <ScoreCard label="Confidence-adjusted" value={scores.confidenceAdjustedMaturityPct} icon={Gauge} />
              </div>

              <section className="rounded-lg border border-[#E3E3E3] bg-white px-4 py-3">
                <h3 className="text-sm font-semibold text-black">Scoring dimensions</h3>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {Object.entries(scores.dimensions).map(([key, val]) => (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="capitalize text-[#666666]">{key.replace(/([A-Z])/g, " $1")}</span>
                        <span className="font-semibold tabular-nums text-black">{val}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F0F0F0]">
                        <div
                          className="h-full rounded-full bg-[var(--theme-brand)]"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-black">By pillar</h3>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {scores.byPillar.map((p) => (
                    <div
                      key={p.pillarId}
                      className="rounded-md border border-[#E3E3E3] bg-white px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-black">{p.pillarLabel}</p>
                      <p className="mt-0.5 text-[11px] text-[#666666]">
                        Maturity {p.maturityPct}% · Confidence {p.confidencePct}%
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-[#D0D0CE] bg-white px-6 py-10 text-center">
              <Gauge className="mx-auto mb-2 h-8 w-8 text-[#D0D0CE]" />
              <p className="text-sm font-semibold text-black">No scores yet</p>
              <p className="mt-1 text-xs text-[#666666]">
                Run the intelligence pipeline to generate maturity scores.
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
    <div className="rounded-lg border border-[#E3E3E3] bg-black px-4 py-3 text-white">
      <Icon className="h-4 w-4 text-[var(--theme-brand)]" />
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}%</p>
      <p className="mt-0.5 text-[11px] text-white/70">{label}</p>
    </div>
  );
}
