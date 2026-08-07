"use client";

import { FileSearch, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { evidenceKindLabel } from "@/lib/evidence-classifier";
import type { CaptureAnalysisAudit, CaptureSourceAudit } from "@/lib/capture-analysis-types";
import { cn } from "@/lib/utils";

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function statusMeta(status: CaptureSourceAudit["status"]) {
  if (status === "cited_in_findings") {
    return {
      label: "Reviewed and cited",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: ShieldCheck,
    };
  }
  if (status === "reviewed_not_cited") {
    return {
      label: "Reviewed, not cited",
      badge: "border-amber-200 bg-amber-50 text-amber-900",
      icon: ShieldQuestion,
    };
  }
  return {
    label: "No first-pass signal",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    icon: ShieldAlert,
  };
}

export function AnalysisAuditTrail({ audit }: { audit: CaptureAnalysisAudit }) {
  const controlsNotAssessed = uniqueStrings(audit.controlsNotAssessed);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-6 py-5">
        <div className="flex items-start gap-3">
          <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Analysis audit trail
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
              What AI reviewed vs. what still needs QA
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              First pass shows which source files produced facts and citations. Second-pass QA
              spot-checks under-covered files so reviewers can challenge potential misses.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Sources analyzed", value: audit.analyzedSourceCount },
            { label: "Sources cited", value: audit.citedSourceCount },
            { label: "Need spot-check", value: audit.underReviewedSourceCount },
            { label: "Controls not assessed", value: controlsNotAssessed.length },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-semibold text-slate-800">Second-pass QA summary</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{audit.secondPassSummary}</p>
        </div>

        {controlsNotAssessed.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Controls still not assessed</p>
            <div className="flex flex-wrap gap-2">
              {controlsNotAssessed.map((code, index) => (
                <Badge
                  key={`${code}-${index}`}
                  variant="outline"
                  className="border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
                >
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {audit.secondPassFindings.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Second-pass flags</p>
            <div className="space-y-2">
              {audit.secondPassFindings.map((finding) => (
                <div
                  key={`${finding.sourceId}-${finding.fileName}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{finding.fileName}</p>
                    <Badge variant="outline" className="border-amber-200 bg-white text-[10px] text-amber-900">
                      {finding.confidence} confidence
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{finding.concern}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{finding.rationale}</p>
                  {uniqueStrings(finding.candidateControlCodes).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {uniqueStrings(finding.candidateControlCodes).map((code, index) => (
                        <Badge
                          key={`${finding.sourceId}-${code}-${index}`}
                          variant="outline"
                          className="bg-white text-[10px] font-medium"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">Source-by-source audit</p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Type</th>
                  <th className="px-4 py-3">Review status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Facts</th>
                  <th className="hidden px-4 py-3 md:table-cell">Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {audit.sourceAudits.map((source) => {
                  const meta = statusMeta(source.status);
                  const Icon = meta.icon;
                  return (
                    <tr key={source.sourceId} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{source.fileName}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{source.reviewNote}</p>
                        {source.controlsCited.length > 0 && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Cited controls: {source.controlsCited.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {evidenceKindLabel(source.kind)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                              meta.badge
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          {source.spotCheckRecommended && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-900">
                              QA spot-check
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="text-sm font-medium text-slate-800">{source.factCount}</span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="text-sm font-medium text-slate-800">{source.citationCount}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
