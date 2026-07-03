"use client";

import { useMemo, useState } from "react";
import { FileText, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Citation = {
  id: string;
  citationIndex: number;
  section: string;
  claimText: string;
  sourceType: string;
  sourceId: string | null;
  sourceLabel: string;
  excerpt: string;
  startOffset: number;
  endOffset: number;
};

type CitedAnalysisProps = {
  text: string;
  citations: Citation[];
  activeCitation: number | null;
  onCitationClick: (index: number) => void;
  className?: string;
};

/** Renders analysis text with [{n}] citation bubbles linking to source excerpts. */
export function CitedAnalysis({
  text,
  citations,
  activeCitation,
  onCitationClick,
  className = "",
}: CitedAnalysisProps) {
  const lines = useMemo(() => text.split("\n").filter((line) => line.trim()), [text]);
  const parts = useMemo(() => parseCitedText(text), [text]);
  const isMultiLine = lines.length > 1;

  if (!text.trim()) {
    return <p className="text-sm italic text-slate-400">No content yet.</p>;
  }

  const renderLine = (line: string, key: string | number) => {
    const parts = parseCitedText(line);
    return (
      <span key={key} className="block">
        {parts.map((part, i) => {
          if (part.type === "citation") {
            const cite = citations.find((c) => c.citationIndex === part.index);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCitationClick(part.index!)}
                className={`mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-all ${
                  activeCitation === part.index
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                    : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                }`}
                title={cite ? `${cite.sourceLabel}: "${cite.excerpt.slice(0, 80)}..."` : `Source ${part.index}`}
              >
                {part.index}
              </button>
            );
          }
          return <span key={i}>{part.text}</span>;
        })}
      </span>
    );
  };

  if (isMultiLine) {
    return (
      <ul className={`list-disc space-y-3 pl-5 text-sm leading-relaxed text-slate-700 ${className}`}>
        {lines.map((line, i) => (
          <li key={i} className="pl-1 marker:text-slate-400">
            {renderLine(line, i)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={`space-y-2 text-sm leading-relaxed text-slate-700 ${className}`}>
      {parts.map((part, i) => {
        if (part.type === "linebreak") {
          return <br key={i} />;
        }
        if (part.type === "citation") {
          const cite = citations.find((c) => c.citationIndex === part.index);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onCitationClick(part.index!)}
              className={`mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-all ${
                activeCitation === part.index
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              }`}
              title={cite ? `${cite.sourceLabel}: "${cite.excerpt.slice(0, 80)}..."` : `Source ${part.index}`}
            >
              {part.index}
            </button>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </div>
  );
}

type SourceTracePanelProps = {
  citation: Citation | null;
  workshopNotes: string;
  facilitatorNotes: string;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  className?: string;
  minHeight?: string;
};

function resolveCitationFileName(
  citation: Citation,
  evidenceTexts: Record<string, { fileName: string; text: string }>
): string | null {
  if (citation.sourceId && evidenceTexts[citation.sourceId]?.fileName) {
    return evidenceTexts[citation.sourceId].fileName;
  }
  const fromLabel = citation.sourceLabel.replace(/^Transcript:\s*/i, "").trim();
  if (fromLabel) return fromLabel;
  return null;
}

function resolveCitationSourceKind(citation: Citation): string {
  if (citation.sourceType === "workshop_notes") return "Workshop notes";
  if (citation.sourceType === "facilitator_notes") return "Facilitator notes";
  if (citation.sourceType === "evidence") return "Uploaded workshop file";
  return citation.sourceType.replace(/_/g, " ");
}

export function SourceTracePanel({
  citation,
  workshopNotes,
  facilitatorNotes,
  evidenceTexts,
  className = "",
  minHeight = "min-h-[420px]",
}: SourceTracePanelProps) {
  if (!citation) {
    return (
      <div
        className={`flex ${minHeight} flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white p-8 text-center shadow-inner ${className}`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
          <Link2 className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-slate-700">Evidence trace</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Select a numbered citation in any finding to view the exact source excerpt, file name, and
          position in the uploaded document.
        </p>
      </div>
    );
  }

  let fullText = "";
  if (citation.sourceType === "workshop_notes") fullText = workshopNotes;
  else if (citation.sourceType === "facilitator_notes") fullText = facilitatorNotes;
  else if (citation.sourceId && evidenceTexts[citation.sourceId]) {
    fullText = evidenceTexts[citation.sourceId].text;
  }

  const contextRadius = 280;
  const before = fullText.slice(Math.max(0, citation.startOffset - contextRadius), citation.startOffset);
  const highlighted = fullText.slice(citation.startOffset, citation.endOffset);
  const after = fullText.slice(citation.endOffset, citation.endOffset + contextRadius);
  const fileName = resolveCitationFileName(citation, evidenceTexts);
  const sourceKind = resolveCitationSourceKind(citation);

  return (
    <div
      className={`flex ${minHeight} flex-col overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/60 to-white shadow-lg shadow-indigo-100/40 ${className}`}
    >
      <div className="shrink-0 border-b border-indigo-100/80 bg-white/70 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
            {citation.citationIndex}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Source evidence
            </p>
            {fileName ? (
              <div className="mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Source file
                </p>
                <p className="mt-0.5 break-all font-mono text-base font-semibold text-slate-900">
                  {fileName}
                </p>
              </div>
            ) : (
              <p className="mt-0.5 text-base font-semibold text-slate-900">{sourceKind}</p>
            )}
            <p className="mt-1.5 text-xs text-slate-500">{sourceKind}</p>
            {citation.claimText && (
              <p className="mt-3 line-clamp-3 text-sm leading-snug text-slate-600">
                <span className="font-medium text-slate-700">Linked finding: </span>
                {citation.claimText}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Verbatim excerpt</span>
            {fileName && (
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-800">
                {fileName}
              </span>
            )}
          </div>
          <div className="font-mono text-sm leading-[1.75] text-slate-700">
            {before && <span className="text-slate-400">{before}</span>}
            <mark className="rounded-sm bg-amber-200/90 px-1 py-0.5 font-semibold text-slate-900">
              {highlighted || citation.excerpt}
            </mark>
            {after && <span className="text-slate-400">{after}</span>}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-indigo-100/80 bg-slate-50/80 px-5 py-3 text-xs text-slate-500">
        {fileName && (
          <span className="font-mono font-medium text-slate-700">{fileName}</span>
        )}
        {fileName && " · "}
        Character offset {citation.startOffset.toLocaleString()}–{citation.endOffset.toLocaleString()}
        {citation.sourceId && (
          <>
            {" · "}
            <span className="text-slate-400">Evidence ID {citation.sourceId.slice(0, 8)}…</span>
          </>
        )}
      </div>
    </div>
  );
}

type SourceEvidenceDialogProps = SourceTracePanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Source evidence in a modal — keeps the main workspace layout uncluttered. */
export function SourceEvidenceDialog({
  open,
  onOpenChange,
  citation,
  workshopNotes,
  facilitatorNotes,
  evidenceTexts,
}: SourceEvidenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,820px)]">
        <DialogHeader>
          <DialogTitle>Source evidence</DialogTitle>
          <DialogDescription>
            Verify findings against the exact excerpt in uploaded workshop materials.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6">
          <SourceTracePanel
            citation={citation}
            workshopNotes={workshopNotes}
            facilitatorNotes={facilitatorNotes}
            evidenceTexts={evidenceTexts}
            minHeight="min-h-[min(60vh,520px)]"
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseCitedText(text: string): Array<{ type: "text" | "citation" | "linebreak"; text?: string; index?: number }> {
  const lines = text.split("\n");
  const parts: Array<{ type: "text" | "citation" | "linebreak"; text?: string; index?: number }> = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) parts.push({ type: "linebreak" });
    const regex = /\[\{(\d+)\}\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", text: line.slice(lastIndex, match.index) });
      }
      parts.push({ type: "citation", index: parseInt(match[1], 10) });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push({ type: "text", text: line.slice(lastIndex) });
    }
  });

  return parts;
}

type CitationReferenceBarProps = {
  citations: Citation[];
  activeCitation: number | null;
  onCitationClick: (index: number) => void;
  className?: string;
};

/** Always-visible source reference row — complements inline [{n}] bubbles. */
export function CitationReferenceBar({
  citations,
  activeCitation,
  onCitationClick,
  className = "",
}: CitationReferenceBarProps) {
  if (citations.length === 0) return null;

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Source references ({citations.length})
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {citations.map((cite) => (
          <button
            key={cite.citationIndex}
            type="button"
            onClick={() => onCitationClick(cite.citationIndex)}
            className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
              activeCitation === cite.citationIndex
                ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
            }`}
          >
            <span
              className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                activeCitation === cite.citationIndex
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {cite.citationIndex}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-800">
                {cite.sourceLabel.replace(/^Transcript:\s*/i, "")}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                &ldquo;{cite.excerpt.slice(0, 140)}
                {cite.excerpt.length > 140 ? "…" : ""}&rdquo;
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

type CitedFindingBlockProps = {
  title: string;
  content: string;
  citations: Citation[];
  section: "in_place" | "gap" | "recommendation";
  activeCitation: number | null;
  onCitationClick: (index: number) => void;
  tone: "positive" | "warning" | "action";
};

export function CitedFindingBlock({
  title,
  content,
  citations,
  section,
  activeCitation,
  onCitationClick,
  tone,
}: CitedFindingBlockProps) {
  const styles = {
    positive: { ring: "ring-emerald-100", bg: "bg-emerald-50/40", label: "text-emerald-800", dot: "bg-emerald-500" },
    warning: { ring: "ring-amber-100", bg: "bg-amber-50/40", label: "text-amber-900", dot: "bg-amber-500" },
    action: { ring: "ring-indigo-100", bg: "bg-indigo-50/35", label: "text-indigo-900", dot: "bg-indigo-500" },
  }[tone];

  const sectionCitations = citations.filter((c) => c.section === section);

  if (!content.trim()) return null;

  return (
    <div className={`rounded-xl p-4 ring-1 ${styles.ring} ${styles.bg}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{title}</p>
        {sectionCitations.length > 0 && (
          <span className="ml-auto text-[10px] font-medium text-slate-500">
            {sectionCitations.length} source{sectionCitations.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <CitedAnalysis
        text={content}
        citations={sectionCitations}
        activeCitation={activeCitation}
        onCitationClick={onCitationClick}
        className="text-sm leading-relaxed text-slate-800"
      />
      {sectionCitations.length > 0 && !content.includes("[{") ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sectionCitations.map((cite) => (
            <button
              key={cite.citationIndex}
              type="button"
              onClick={() => onCitationClick(cite.citationIndex)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${
                activeCitation === cite.citationIndex
                  ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
              }`}
            >
              <span className="font-bold text-indigo-600">[{cite.citationIndex}]</span>
              <span className="max-w-[140px] truncate">
                {cite.sourceLabel.replace(/^Transcript:\s*/i, "")}
              </span>
            </button>
          ))}
        </div>
      ) : content.trim().length > 0 && !content.includes("[{") && sectionCitations.length === 0 ? (
        <p className="mt-2 text-xs text-amber-700">
          No source citations linked — re-run analysis or verify in Validate before relying on this finding.
        </p>
      ) : null}
    </div>
  );
}
