"use client";

import { ClipboardList, FileCheck, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ControlWorkshopGuide } from "@/lib/control-workshop-guide";

type Props = {
  guide: ControlWorkshopGuide | null;
  loading?: boolean;
};

export function ControlReviewerGuidePanel({ guide, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Loading reviewer guide…
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Select a control to view operating procedures and expected evidence.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <ListChecks className="h-4 w-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-800">
            Operating Procedures
            <Badge variant="secondary" className="ml-2">{guide.procedures.length}</Badge>
          </h4>
        </div>
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {guide.procedures.length === 0 ? (
            <p className="text-xs text-slate-400">No procedure documented for this control.</p>
          ) : (
            guide.procedures.map((proc) => (
              <div key={proc.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-xs font-medium text-slate-500">
                  Responsible: {proc.responsibleRole}
                  {proc.linkedPolicy && ` · Policy: ${proc.linkedPolicy}`}
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{proc.steps}</pre>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <FileCheck className="h-4 w-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-800">
            Expected Evidence
            <Badge variant="secondary" className="ml-2">{guide.expectedEvidence.length}</Badge>
          </h4>
        </div>
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {guide.expectedEvidence.length === 0 ? (
            <p className="text-xs text-slate-400">No evidence types defined. Request general documentation from the client.</p>
          ) : (
            guide.expectedEvidence.map((ev) => (
              <div key={ev.id} className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                <span className="text-sm font-medium text-slate-800">{ev.evidenceType}</span>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{ev.description}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                  {ev.retentionPeriod && <span>Retention: {ev.retentionPeriod}</span>}
                  {ev.collectionMethod && <span>Collection: {ev.collectionMethod}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {guide.subPillarWorkshop.length > 0 && (
        <p className="text-[11px] text-slate-400">
          <ClipboardList className="mr-1 inline h-3 w-3" />
          Workshop questions for this control&apos;s topics are in the{" "}
          <strong className="font-medium text-slate-500">Workshop Runbook</strong> tab under{" "}
          {guide.subPillarWorkshop.map((b) => b.subPillarLabel).join(", ")}.
        </p>
      )}
    </div>
  );
}
