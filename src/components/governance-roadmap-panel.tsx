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
      <div className="flex h-full items-center justify-center bg-[#FAFAFA]/40 text-sm text-[#666666]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading roadmap…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFAFA]/40">
      <header className="shrink-0 border-b border-[#E3E3E3] bg-white px-3 py-2 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-brand)]">
          Intelligence
        </p>
        <h2 className="text-sm font-semibold text-black">Prioritized roadmap</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 [scrollbar-width:thin]">
        {initiatives.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D0D0CE] bg-white px-6 py-10 text-center">
            <Map className="mx-auto mb-2 h-8 w-8 text-[#D0D0CE]" />
            <p className="text-sm font-semibold text-black">No roadmap initiatives yet</p>
            <p className="mt-1 text-xs text-[#666666]">
              Run the intelligence pipeline from Scores to generate initiatives.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {initiatives.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[#E3E3E3] bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black text-xs font-semibold text-white">
                    {item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-black">{item.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {PHASE_LABELS[item.phase] ?? item.phase}
                      </Badge>
                      <Badge className="bg-[#EEF7E0] text-[#046A38] hover:bg-[#EEF7E0]">
                        ROI {item.governanceRoiScore}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-[#666666]">{item.description}</p>
                    {item.whyPrioritized && (
                      <p className="mt-1.5 text-[11px] font-medium text-[#046A38]">{item.whyPrioritized}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-[#A7A8AA]">
                      Effort {item.effortEstimate} · Depends on {item.dependsOnControlIds.length} · Unlocks{" "}
                      {item.unlocksControlIds.length}
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
