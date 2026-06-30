"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Eye,
  FileAudio,
  FileText,
  FlaskConical,
  FolderOpen,
  Download,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  countWorkshopEntries,
  NOTES_TAG_STYLES,
  parseWorkshopNotes,
  type WorkshopNotesSection,
} from "@/lib/workshop-notes-parser";
import { isTranscriptEvidence } from "@/lib/transcript-evidence";
import { SAMPLE_TRANSCRIPT_FILES } from "@/lib/sample-transcript-files";

type EvidenceFile = {
  id: string;
  fileName: string;
  extractedText: string | null;
  description?: string | null;
};

type Props = {
  workshopNotes: string;
  facilitatorNotes: string;
  evidence: EvidenceFile[];
  saving: string;
  mapResult: string | null;
  sampleLoaded: boolean;
  onWorkshopNotesChange: (value: string) => void;
  onFacilitatorNotesChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onBulkMap: () => void | Promise<void>;
  onLoadSample: () => void;
  onLoadAndMapSample: () => void | Promise<void>;
  onGoToReview: () => void;
  onUploadEvidence: (file: File) => void | Promise<void>;
  onUploadTranscript: (file: File) => void | Promise<void>;
  onUploadSampleTranscripts: () => void | Promise<void>;
  onProcessTranscripts: (mergeMode: "merge" | "replace", runControlAnalysis: boolean) => void | Promise<void>;
  onDeleteEvidence: (evidenceId: string) => void | Promise<void>;
};

function SectionNav({
  sections,
  activeId,
  onSelect,
}: {
  sections: WorkshopNotesSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const pillars = useMemo(() => {
    const groups: Array<{ pillar?: string; items: WorkshopNotesSection[] }> = [];
    for (const section of sections) {
      const pillar = section.pillarLabel;
      const last = groups[groups.length - 1];
      if (last && last.pillar === pillar) {
        last.items.push(section);
      } else {
        groups.push({ pillar, items: [section] });
      }
    }
    return groups;
  }, [sections]);

  return (
    <nav className="space-y-3">
      {pillars.map((group) => (
        <div key={group.pillar ?? group.items[0]?.id}>
          {group.pillar && (
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {group.pillar}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelect(section.id)}
                className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] leading-snug transition-colors ${
                  activeId === section.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <ChevronRight
                  className={`h-3 w-3 shrink-0 ${activeId === section.id ? "text-indigo-200" : "text-slate-300"}`}
                />
                <span className="line-clamp-2">
                  {section.topicLabel ?? section.pillarLabel ?? "Notes"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ReadSection({ section }: { section: WorkshopNotesSection }) {
  return (
    <section id={`notes-${section.id}`} className="scroll-mt-3">
      {(section.pillarLabel || section.topicLabel) && (
        <div className="mb-3 border-b border-slate-100 pb-2">
          {section.pillarLabel && section.topicLabel && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              {section.pillarLabel}
            </p>
          )}
          <h3 className="text-sm font-semibold text-slate-900">
            {section.topicLabel ?? section.pillarLabel}
          </h3>
        </div>
      )}

      {section.preamble && (
        <p className="mb-4 text-sm leading-relaxed text-slate-600">{section.preamble}</p>
      )}

      <div className="space-y-3">
        {section.entries.map((entry, i) => (
          <article
            key={`${section.id}-${i}`}
            className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div className="flex flex-wrap items-start gap-2">
              <p className="flex-1 text-xs font-medium leading-relaxed text-slate-500">{entry.question}</p>
              {entry.tag && (
                <Badge variant="outline" className={`shrink-0 text-[10px] ${NOTES_TAG_STYLES[entry.tag].className}`}>
                  {NOTES_TAG_STYLES[entry.tag].label}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{entry.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AttachmentChip({
  fileName,
  indexed,
  deleting,
  onDelete,
}: {
  fileName: string;
  indexed: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex max-w-xs items-center gap-1 rounded-md border border-indigo-100 bg-white py-1 pl-2 pr-1"
      title={fileName}
    >
      <FileText className="h-3 w-3 shrink-0 text-indigo-400" />
      <span className="min-w-0 truncate text-[11px] text-slate-700">{fileName}</span>
      {indexed ? (
        <Badge variant="outline" className="shrink-0 text-[9px] text-emerald-700 border-emerald-200">
          indexed
        </Badge>
      ) : (
        <Badge variant="outline" className="shrink-0 text-[9px] text-amber-700 border-amber-200">
          unreadable
        </Badge>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="ml-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        title="Remove file"
        aria-label={`Remove ${fileName}`}
      >
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function WorkshopCapturePanel({
  workshopNotes,
  facilitatorNotes,
  evidence,
  saving,
  mapResult,
  sampleLoaded,
  onWorkshopNotesChange,
  onFacilitatorNotesChange,
  onSave,
  onBulkMap,
  onLoadSample,
  onLoadAndMapSample,
  onGoToReview,
  onUploadEvidence,
  onUploadTranscript,
  onUploadSampleTranscripts,
  onProcessTranscripts,
  onDeleteEvidence,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sampleLoadHandled = useRef(false);
  const [viewMode, setViewMode] = useState<"read" | "edit">("read");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [notesPane, setNotesPane] = useState<"workshop" | "facilitator">("workshop");
  const [mergeTranscripts, setMergeTranscripts] = useState(true);
  const [runControlAnalysis, setRunControlAnalysis] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isProcessing = saving === "transcripts" || saving === "analyzing";

  const transcripts = useMemo(
    () => evidence.filter((f) => isTranscriptEvidence(f.description)),
    [evidence]
  );
  const supportingEvidence = useMemo(
    () => evidence.filter((f) => !isTranscriptEvidence(f.description)),
    [evidence]
  );
  const indexedTranscripts = transcripts.filter((t) => t.extractedText);

  const parsed = useMemo(() => parseWorkshopNotes(workshopNotes), [workshopNotes]);
  const entryCount = countWorkshopEntries(parsed);
  const wordCount = workshopNotes.trim() ? workshopNotes.trim().split(/\s+/).length : 0;
  const canRead = workshopNotes.trim().length > 0;
  const showStructuredRead = parsed.hasStructure && viewMode === "read";

  useEffect(() => {
    if (!canRead && viewMode === "read") setViewMode("edit");
  }, [canRead, viewMode]);

  // Switch to read once when sample is first loaded — do not force read on every edit.
  useEffect(() => {
    if (sampleLoaded && !sampleLoadHandled.current) {
      sampleLoadHandled.current = true;
      setViewMode("read");
    }
    if (!sampleLoaded) {
      sampleLoadHandled.current = false;
    }
  }, [sampleLoaded]);

  useEffect(() => {
    if (parsed.sections.length > 0 && !activeSectionId) {
      setActiveSectionId(parsed.sections[0].id);
    }
  }, [parsed.sections, activeSectionId]);

  function scrollToSection(id: string) {
    setActiveSectionId(id);
    document.getElementById(`notes-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDelete(evidenceId: string, fileName: string) {
    if (!window.confirm(`Remove "${fileName}"? This cannot be undone.`)) return;
    setDeletingId(evidenceId);
    try {
      await onDeleteEvidence(evidenceId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          <button
            type="button"
            disabled={!canRead}
            onClick={() => setViewMode("read")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "read"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700 disabled:opacity-40"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Read
          </button>
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "edit"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {canRead && (
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            {wordCount.toLocaleString()} words
            {entryCount > 0 ? ` · ${entryCount} responses` : ""}
            {parsed.sections.length > 0 ? ` · ${parsed.sections.length} topics` : ""}
          </span>
        )}

        <div className="flex-1" />

        {viewMode === "read" && canRead && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode("edit")}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit notes
          </Button>
        )}

        <Button onClick={onSave} disabled={!!saving} variant="outline" size="sm" className="h-7 text-xs">
          {saving === "bulk" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
        <Button onClick={onBulkMap} disabled={!!saving || !workshopNotes.trim()} size="sm" className="h-7 text-xs">
          {saving === "map" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          Auto-map
        </Button>
        <Button
          type="button"
          onClick={onLoadSample}
          disabled={!!saving}
          variant="ghost"
          size="sm"
          className="hidden h-7 text-xs text-indigo-600 sm:inline-flex"
        >
          <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
          Sample
        </Button>
        <Button
          type="button"
          onClick={() => void onLoadAndMapSample()}
          disabled={!!saving}
          variant="ghost"
          size="sm"
          className="hidden h-7 text-xs text-indigo-600 md:inline-flex"
        >
          <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
          Sample & map
        </Button>
      </div>

      {(sampleLoaded && !mapResult) || mapResult ? (
        <div className="shrink-0 border-b border-slate-100 px-3 py-2">
          {sampleLoaded && !mapResult && (
            <p className="text-xs text-indigo-800">
              Sample notes loaded — includes compliant, partial, and gap responses.{" "}
              <button
                type="button"
                className="font-medium underline hover:no-underline"
                onClick={() => setViewMode("edit")}
              >
                Edit notes
              </button>{" "}
              to customize, then Save and auto-map (or use Sample &amp; map to jump to Review).
            </p>
          )}
          {mapResult && (
            <p className="text-xs text-emerald-800">
              {mapResult}
              <button type="button" className="ml-2 font-medium underline hover:no-underline" onClick={onGoToReview}>
                View in Review →
              </button>
            </p>
          )}
        </div>
      ) : null}

      {/* Transcript uploads — primary ingestion path for workshop recordings */}
      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
            <FileAudio className="h-3.5 w-3.5" />
            Workshop transcripts
          </div>
          <Badge variant="outline" className="text-[10px]">
            {transcripts.length} file{transcripts.length !== 1 ? "s" : ""}
          </Badge>
          <div className="flex-1" />
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50">
            <Upload className="h-3.5 w-3.5" />
            Upload transcripts
            <input
              type="file"
              className="hidden"
              multiple
              accept=".txt,.md,.csv,text/plain,text/markdown"
              onChange={(e) => {
                const files = e.target.files;
                if (files) void Promise.all([...files].map((f) => onUploadTranscript(f)));
                e.target.value = "";
              }}
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-indigo-600"
            disabled={!!saving}
            onClick={() => void onUploadSampleTranscripts()}
            title="Skip download — loads all three sample files directly into this assessment"
          >
            <FlaskConical className="mr-1 h-3 w-3" />
            Auto-load samples
          </Button>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <input
              type="checkbox"
              checked={mergeTranscripts}
              onChange={(e) => setMergeTranscripts(e.target.checked)}
              className="rounded border-slate-300"
              disabled={isProcessing}
            />
            Merge with existing notes
          </label>
          <label
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-600"
            title="Runs AI analysis on every scoped control after extract — can take several minutes"
          >
            <input
              type="checkbox"
              checked={runControlAnalysis}
              onChange={(e) => setRunControlAnalysis(e.target.checked)}
              className="rounded border-slate-300"
              disabled={isProcessing}
            />
            Also analyze all controls
          </label>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={!!saving || indexedTranscripts.length === 0}
            onClick={() => void onProcessTranscripts(mergeTranscripts ? "merge" : "replace", runControlAnalysis)}
          >
            {saving === "transcripts" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : saving === "analyzing" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {saving === "analyzing" ? "Analyzing controls…" : "Analyze transcripts"}
          </Button>
        </div>
        {isProcessing && (
          <p className="mt-1.5 text-[11px] text-indigo-700">
            {saving === "transcripts"
              ? "Extracting notes from transcripts with AI — this usually takes 30–90 seconds…"
              : "Running AI control analysis across all scoped controls — this may take several minutes…"}
          </p>
        )}
        {transcripts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {transcripts.map((t) => (
              <AttachmentChip
                key={t.id}
                fileName={t.fileName}
                indexed={!!t.extractedText}
                deleting={deletingId === t.id}
                onDelete={() => void handleDelete(t.id, t.fileName)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-slate-500">
            Upload .txt or .md transcript exports from recordings. AI extracts framework-aligned notes, maps controls,
            and runs gap analysis — grounded in source text only.
          </p>
        )}
        <div className="mt-2 rounded-md border border-indigo-100 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Download samples to review
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Save these locally, review the content, then use <strong>Upload transcripts</strong> above to test the
            workflow.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SAMPLE_TRANSCRIPT_FILES.map((file) => (
              <a
                key={file.fileName}
                href={file.href}
                download={file.fileName}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
              >
                <Download className="h-3 w-3 shrink-0" />
                {file.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main notes area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showStructuredRead && (
          <aside className="hidden w-52 shrink-0 flex-col border-r border-slate-100 bg-slate-50/80 md:flex">
            <p className="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Topics
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              <SectionNav
                sections={parsed.sections}
                activeId={activeSectionId}
                onSelect={scrollToSection}
              />
            </div>
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {viewMode === "read" ? (
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-white">
              {!canRead ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <BookOpen className="h-10 w-10 text-slate-200" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">No workshop notes yet</p>
                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                      Switch to Edit to paste transcripts, or load sample data to preview the reading view.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewMode("edit")}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Start editing
                    </Button>
                    <Button size="sm" variant="ghost" className="text-indigo-600" onClick={onLoadSample}>
                      <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                      Load sample
                    </Button>
                  </div>
                </div>
              ) : parsed.hasStructure ? (
                <div className="mx-auto max-w-3xl space-y-8 px-4 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="text-xs text-slate-500">Reading view — switch to Edit to update responses.</p>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setViewMode("edit")}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit notes
                    </Button>
                  </div>
                  {parsed.title && (
                    <header>
                      <h2 className="text-lg font-semibold text-slate-900">{parsed.title}</h2>
                      {parsed.intro && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                          {parsed.intro}
                        </p>
                      )}
                    </header>
                  )}
                  {parsed.sections.map((section) => (
                    <ReadSection key={section.id} section={section} />
                  ))}
                </div>
              ) : (
                <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="text-xs text-slate-500">Reading view — switch to Edit to update notes.</p>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setViewMode("edit")}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit notes
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                    {workshopNotes}
                  </pre>
                </div>
              )}

              {facilitatorNotes.trim() && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
                  <details className="mx-auto max-w-3xl">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                      Facilitator notes (internal)
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">
                      {facilitatorNotes}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => setNotesPane("workshop")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    notesPane === "workshop" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
                  }`}
                >
                  <FileText className="mr-1 inline h-3 w-3" />
                  Workshop notes
                </button>
                <button
                  type="button"
                  onClick={() => setNotesPane("facilitator")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    notesPane === "facilitator" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
                  }`}
                >
                  Facilitator (internal)
                </button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                {notesPane === "workshop" ? (
                  <textarea
                    className="h-full min-h-[200px] w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Paste workshop transcript, client quotes, and Q&A responses from the session…"
                    value={workshopNotes}
                    onChange={(e) => onWorkshopNotesChange(e.target.value)}
                  />
                ) : (
                  <textarea
                    className="h-full min-h-[120px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Internal facilitator observations — not shared with client or used in client-facing exports."
                    value={facilitatorNotes}
                    onChange={(e) => onFacilitatorNotesChange(e.target.value)}
                  />
                )}
              </div>
              <p className="shrink-0 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
                Tip: Use ## pillar and ### topic headers with Q:/A: lines for structured reading view.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compact evidence strip */}
      <details className="group shrink-0 border-t border-slate-200 bg-slate-50/80">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100/80 [&::-webkit-details-marker]:hidden">
          <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
          <span>Supporting evidence</span>
          <Badge variant="outline" className="ml-1 text-[10px]">
            {supportingEvidence.length} file{supportingEvidence.length !== 1 ? "s" : ""}
          </Badge>
          <span className="ml-auto text-[10px] font-normal text-slate-400 group-open:hidden">
            Optional — expand to upload
          </span>
        </summary>
        <div className="border-t border-slate-100 bg-white px-3 py-3">
          <div className="flex flex-wrap items-start gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
              <Upload className="h-4 w-4 text-slate-400" />
              <span>Upload files</span>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) void Promise.all([...files].map((f) => onUploadEvidence(f)));
                  e.target.value = "";
                }}
              />
            </label>
            {supportingEvidence.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {supportingEvidence.map((f) => (
                  <AttachmentChip
                    key={f.id}
                    fileName={f.fileName}
                    indexed={!!f.extractedText}
                    deleting={deletingId === f.id}
                    onDelete={() => void handleDelete(f.id, f.fileName)}
                  />
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">PDF, DOCX, images — used during AI analysis</span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
