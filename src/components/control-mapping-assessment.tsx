"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileCheck,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CitedFindingBlock,
  SourceEvidenceDialog,
  type Citation,
} from "@/components/cited-analysis";
import { ControlDocumentationPanel } from "@/components/control-documentation-panel";
import type { ExplainabilityPayload, TraceabilityScoreBreakdown } from "@/lib/governance-v2/types";
import { cn } from "@/lib/utils";

type LinkedEvidence = {
  id: string;
  rawText: string;
  confidenceScore: number;
  sourceFileName: string | null;
  sourceEvidenceId: string | null;
};

type MappingRowData = {
  complianceStatus: string;
  mappingConfidence: number | null;
  evidenceStrength: number | null;
  ambiguityFlags: string[];
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  control: { code: string; title: string; ownerRole: string };
  disagreements: Array<{ id: string; status: string; mismatchReason: string | null }>;
  citations: Citation[];
  linkedEvidence: LinkedEvidence[];
  explainability: ExplainabilityPayload | null;
};

const STATUS_COLORS: Record<string, string> = {
  aligned: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  gap: "bg-red-100 text-red-800 border-red-200",
  not_assessed: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  aligned: "Aligned",
  partial: "Partial",
  gap: "Gap",
  not_assessed: "Not assessed",
};

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  const pct = value == null ? null : Math.round(value * 100);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums",
          pct == null ? "text-slate-300" : pct >= 70 ? "text-emerald-600" : pct >= 45 ? "text-amber-600" : "text-rose-600"
        )}
      >
        {pct == null ? "—" : `${pct}%`}
      </p>
    </div>
  );
}

function ScoreBreakdownPanel({ breakdown }: { breakdown: TraceabilityScoreBreakdown }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-700">
        Score breakdown
      </summary>
      <ul className="space-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
        {breakdown.factors.map((f) => (
          <li key={f.label}>
            <span className="font-medium text-slate-800">{f.label}</span> — {f.detail}
          </li>
        ))}
      </ul>
    </details>
  );
}

function PostureBar({
  docCoverage,
  hasWorkshopFindings,
  complianceStatus,
}: {
  docCoverage: number | null;
  hasWorkshopFindings: boolean;
  complianceStatus: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Workshop</p>
          <p className="mt-0.5 text-xs font-medium text-slate-800">
            {hasWorkshopFindings ? "Discussed in sources" : "Not covered in analysis"}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
        <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Documentation</p>
          <p className="mt-0.5 text-xs font-medium text-slate-800">
            {docCoverage == null
              ? "Not validated yet"
              : docCoverage >= 100
                ? "Required artifacts validated"
                : `${docCoverage}% of required artifacts validated`}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Posture</p>
          <p className="mt-0.5 text-xs font-medium text-slate-800">
            {STATUS_LABELS[complianceStatus] ?? complianceStatus}
          </p>
        </div>
      </div>
    </div>
  );
}

type Props = {
  row: MappingRowData;
  assessmentId: string;
  pillarLabel?: string;
  pillarDescription?: string;
  activeCitation: number | null;
  onCitationClick: (index: number) => void;
  onDocumentationValidated?: () => void;
  workshopNotes: string;
  facilitatorNotes: string;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  dialogOpen: boolean;
  dialogCitation: Citation | null;
  onDialogOpenChange: (open: boolean) => void;
  showEvidenceDialog: boolean;
};

export function ControlMappingAssessment({
  row,
  assessmentId,
  pillarLabel,
  pillarDescription,
  activeCitation,
  onCitationClick,
  onDocumentationValidated,
  workshopNotes,
  facilitatorNotes,
  evidenceTexts,
  dialogOpen,
  dialogCitation,
  onDialogOpenChange,
  showEvidenceDialog,
}: Props) {
  const breakdown = row.explainability?.scoreBreakdown;
  const docValidation = row.explainability?.documentationValidation;
  const docCoverage = docValidation?.coveragePct ?? null;

  const hasWorkshopFindings = useMemo(
    () =>
      Boolean(row.inPlaceFindings.trim() || row.gapFindings.trim()) ||
      row.citations.length > 0,
    [row]
  );

  const hasAnyFindings =
    Boolean(row.inPlaceFindings.trim()) ||
    Boolean(row.gapFindings.trim()) ||
    Boolean(row.recommendations.trim());

  return (
    <div className="space-y-5">
      {pillarLabel && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Risk pillar</p>
          <p className="mt-0.5 text-sm font-semibold text-indigo-950">{pillarLabel}</p>
          {pillarDescription && (
            <p className="mt-1 text-xs leading-relaxed text-indigo-900/70">{pillarDescription}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-indigo-700">{row.control.code}</span>
            <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[row.complianceStatus] ?? "")}>
              {STATUS_LABELS[row.complianceStatus] ?? row.complianceStatus}
            </Badge>
          </div>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-900">{row.control.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{row.control.ownerRole}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScoreChip label="Traceability" value={row.mappingConfidence} />
          <ScoreChip label="Strength" value={row.evidenceStrength} />
        </div>
      </div>

      <PostureBar
        docCoverage={docCoverage}
        hasWorkshopFindings={hasWorkshopFindings}
        complianceStatus={row.complianceStatus}
      />

      {row.ambiguityFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {row.ambiguityFlags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-900 ring-1 ring-amber-200"
            >
              <AlertTriangle className="h-3 w-3" />
              {flag}
            </span>
          ))}
        </div>
      )}

      {row.disagreements.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Reviewer disagreement open</p>
          <p className="mt-1 text-xs text-amber-900/80">
            {row.disagreements[0]?.mismatchReason ?? "Resolve in Validate before treating this mapping as final."}
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Assessment findings</p>
            <p className="text-[11px] text-slate-500">
              Synthesized from workshop discussion and uploaded evidence against control requirements
            </p>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <CitedFindingBlock
            title="In place"
            content={row.inPlaceFindings}
            section="in_place"
            citations={row.citations}
            activeCitation={activeCitation}
            onCitationClick={onCitationClick}
            tone="positive"
          />
          <CitedFindingBlock
            title="Gaps"
            content={row.gapFindings}
            section="gap"
            citations={row.citations}
            activeCitation={activeCitation}
            onCitationClick={onCitationClick}
            tone="warning"
          />
          <CitedFindingBlock
            title="Recommendations"
            content={row.recommendations}
            section="recommendation"
            citations={row.citations}
            activeCitation={activeCitation}
            onCitationClick={onCitationClick}
            tone="action"
          />
          {!hasAnyFindings && (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
              No assessment yet. Upload sources in Evidence, run analysis, then sync mapping.
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/60 to-white px-4 py-3">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Requirements & proof</p>
            <p className="text-[11px] text-slate-500">
              Framework obligations, required artifacts, upload proof, and AI validation
            </p>
          </div>
        </div>
        <div className="p-4">
          <ControlDocumentationPanel
            assessmentId={assessmentId}
            controlCode={row.control.code}
            onValidationChange={onDocumentationValidated}
            compactRequirements
          />
        </div>
      </section>

      {breakdown && <ScoreBreakdownPanel breakdown={breakdown} />}

      {row.linkedEvidence.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Linked source excerpts</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.linkedEvidence.map((ev) => (
              <Badge key={ev.id} variant="outline" className="text-[10px] font-normal">
                {ev.sourceFileName ?? "Structured evidence"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {showEvidenceDialog && (
        <SourceEvidenceDialog
          open={dialogOpen}
          onOpenChange={onDialogOpenChange}
          citation={dialogCitation}
          workshopNotes={workshopNotes}
          facilitatorNotes={facilitatorNotes}
          evidenceTexts={evidenceTexts}
        />
      )}
    </div>
  );
}
