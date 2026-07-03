"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Cpu, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { StructuredSignals } from "@/lib/governance-v2/types";

type EvidenceRow = {
  id: string;
  source: string;
  rawText: string;
  structuredSignals: StructuredSignals;
  confidenceScore: number;
  aiSystem?: { id: string; name: string } | null;
  sourceFile?: { id: string; fileName: string } | null;
};

type SystemRow = {
  id: string;
  name: string;
  modelType: string;
  deploymentStage: string;
  autonomyLevel: string;
  detectedByAi: boolean;
  confidenceScore: number | null;
  _count?: { governanceEvidence: number };
};

type Props = {
  assessmentId: string;
  /** Inline section inside Capture workspace vs standalone page. */
  embedded?: boolean;
  onEvidenceCountChange?: (count: number) => void;
};

export function GovernanceEvidencePanel({
  assessmentId,
  embedded = false,
  onEvidenceCountChange,
}: Props) {
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [structuring, setStructuring] = useState(false);
  const onCountChangeRef = useRef(onEvidenceCountChange);
  onCountChangeRef.current = onEvidenceCountChange;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, sysRes] = await Promise.all([
        fetch(`/api/assessments/${assessmentId}/governance-evidence`),
        fetch(`/api/assessments/${assessmentId}/ai-systems`),
      ]);
      const evData = await evRes.json();
      const sysData = await sysRes.json();
      const rows = evData.evidence ?? [];
      setEvidence(rows);
      setSystems(sysData.systems ?? []);
      onCountChangeRef.current?.(rows.length);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runStructure() {
    setStructuring(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/governance-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "structure_repository" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Structuring failed");
      toast(`Structured ${data.createdEvidence?.length ?? 0} evidence objects.`, {
        variant: "success",
      });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", { variant: "error" });
    } finally {
      setStructuring(false);
    }
  }

  const header = embedded ? (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-6 py-5">
      <div className="flex items-start gap-3">
        <Brain className="mt-0.5 h-6 w-6 text-indigo-600" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
            Step 4 — Structure
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-slate-900">Structured evidence objects</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Extract tagged proof points and AI systems from your analyzed sources. These feed control
            mapping, dependency scoring, and the intelligence pipeline.
          </p>
        </div>
      </div>
      <Button onClick={() => void runStructure()} disabled={structuring} className="shrink-0 gap-2">
        {structuring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Structure from sources
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Structured evidence</h2>
        <p className="text-sm text-slate-500">
          Evidence objects extracted from workshop notes with confidence scoring and AI system links.
        </p>
      </div>
      <Button onClick={() => void runStructure()} disabled={structuring} className="gap-2">
        {structuring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Structure from notes
      </Button>
    </div>
  );

  const body = loading ? (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-slate-500",
        embedded ? "p-10" : "h-full"
      )}
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading structured evidence…
    </div>
  ) : (
    <div className={cn("space-y-6", embedded ? "p-6" : "")}>
      {systems.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Cpu className="h-4 w-4 text-indigo-600" />
            AI systems registry ({systems.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((sys) => (
              <div
                key={sys.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-slate-900">{sys.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{sys.modelType}</Badge>
                  <Badge variant="secondary">{sys.deploymentStage}</Badge>
                  {sys.detectedByAi && (
                    <Badge className="bg-indigo-50 text-indigo-700">AI detected</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {sys._count?.governanceEvidence ?? 0} linked evidence · autonomy {sys.autonomyLevel}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Brain className="h-4 w-4 text-indigo-600" />
          Evidence objects ({evidence.length})
        </h3>
        {evidence.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No structured evidence yet. Run analysis above, then click &ldquo;Structure from sources&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.map((ev) => {
              const signals = ev.structuredSignals ?? {};
              return (
                <article
                  key={ev.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{ev.source}</Badge>
                    <span
                      className={cn(
                        "text-xs font-bold tabular-nums",
                        ev.confidenceScore >= 0.7
                          ? "text-emerald-600"
                          : ev.confidenceScore >= 0.5
                            ? "text-amber-600"
                            : "text-red-600"
                      )}
                    >
                      {Math.round(ev.confidenceScore * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{ev.rawText}</p>
                  {ev.aiSystem && (
                    <p className="mt-2 text-xs text-indigo-600">Linked system: {ev.aiSystem.name}</p>
                  )}
                  {(signals.riskIndicators?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {signals.riskIndicators!.map((r, i) => (
                        <span key={i} className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-700">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );

  if (embedded) {
    return (
      <section
        id="pipeline-structure"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm scroll-mt-6"
      >
        {header}
        {body}
      </section>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {header}
      {body}
    </div>
  );
}

/** @deprecated Use GovernanceEvidencePanel embedded in the Capture workspace. */
export function GovernanceEvidenceView({ assessmentId }: { assessmentId: string }) {
  return <GovernanceEvidencePanel assessmentId={assessmentId} />;
}
