"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Initiative = {
  id: string;
  title: string;
  description: string;
  governanceRoiScore: number;
  phase: string;
  rank: number;
  whyPrioritized: string | null;
  dependsOnControlIds: string[];
  unlocksControlIds: string[];
  effortEstimate: number;
};

const PHASE_LABELS: Record<string, string> = {
  immediate: "0–90 days",
  short_term: "3–6 months",
  medium_term: "6–12 months",
};

export function GovernanceRoadmapPanel({ assessmentId }: { assessmentId: string }) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/intelligence`);
      const data = await res.json();
      setInitiatives(data.initiatives ?? []);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f6f7f9] text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading roadmap…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f6f7f9]">
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            Governance intelligence
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Prioritized roadmap
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Initiatives ranked by governance ROI — risk reduction, compliance coverage, and dependency
            unlock value per effort.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {initiatives.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <Map className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-800">No roadmap initiatives yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Run the intelligence pipeline from the Scores tab to generate dependency-aware initiatives.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {initiatives.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <Badge variant="outline">{PHASE_LABELS[item.phase] ?? item.phase}</Badge>
                      <Badge className="bg-indigo-50 text-indigo-800 hover:bg-indigo-50">
                        ROI {item.governanceRoiScore}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    {item.whyPrioritized && (
                      <p className="mt-2 text-xs font-medium text-indigo-700">{item.whyPrioritized}</p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">
                      Effort estimate: {item.effortEstimate} · Depends on {item.dependsOnControlIds.length}{" "}
                      control(s) · Unlocks {item.unlocksControlIds.length} path(s)
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
