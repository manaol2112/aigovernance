"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileImage,
  FileText,
  FolderOpen,
  GitCompare,
  Loader2,
  MessageCircle,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EvidencePipelineStepper } from "@/components/evidence-pipeline-stepper";
import { SourceNotebookChatLauncher } from "@/components/source-notebook-chat";
import { FollowUpQuestionsExportButton } from "@/components/follow-up-questions-export-button";
import { AnalysisAuditTrail } from "@/components/analysis-audit-trail";
import { evidenceKindLabel } from "@/lib/evidence-classifier";
import { isAnalyzableEvidence, parseEvidenceKind } from "@/lib/transcript-evidence";
import type { EvidencePipelineStepId } from "@/lib/evidence-pipeline";
import type { CaptureAnalysisSummary } from "@/lib/capture-analysis-types";

const ACCEPT =
  ".pdf,.txt,.docx,.jpeg,.jpg,.png,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";
const ACCEPT_LABEL = "PDF, TXT, Word (.docx), JPEG/PNG";

type EvidenceFile = {
  id: string;
  fileName: string;
  fileSize?: number;
  extractedText: string | null;
  description?: string | null;
};

type Props = {
  assessmentId: string;
  evidence: EvidenceFile[];
  saving: string;
  analysisSummary: CaptureAnalysisSummary | null;
  analysisStale: boolean;
  lastAnalyzedAt: string | null;
  analysisError: string | null;
  onUploadFiles: (files: File[]) => void | Promise<void>;
  onDeleteFile: (evidenceId: string) => void | Promise<void>;
  onAnalyzeAll: () => void | Promise<void>;
  onGoToMapping: () => void;
};

type IndexStats = { chunkCount: number; sourceCount: number; totalChars: number };

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return <FileImage className="h-4 w-4 text-indigo-500" />;
  }
  return <FileText className="h-4 w-4 text-indigo-500" />;
}

function SectionHeader({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Step {step}</p>
        <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function AnalysisCompleteCard({
  summary,
  onOpenMapping,
}: {
  summary: CaptureAnalysisSummary;
  onOpenMapping: () => void;
}) {
  const counts = { aligned: 0, partial: 0, gap: 0, not_assessed: 0 };
  for (const m of summary.mappings) {
    counts[m.complianceStatus] += 1;
  }

  return (
    <section
      id="pipeline-mapping-cta"
      className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm scroll-mt-6"
    >
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-white px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Analysis complete
              </p>
              <h3 className="mt-0.5 text-lg font-semibold text-slate-900">Sources mapped to controls</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{summary.summary}</p>
            </div>
          </div>
          <Button onClick={onOpenMapping} className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700">
            <GitCompare className="h-4 w-4" />
            Open traceability mapping
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Files processed", value: summary.filesProcessed },
            { label: "Controls mapped", value: summary.controlsMapped },
            { label: "Aligned", value: counts.aligned },
            { label: "Partial / gap", value: counts.partial + counts.gap },
            { label: "Not discussed", value: summary.topicsNotDiscussed.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 text-sm text-slate-600">
        Review findings, citation links, and traceability scores in the{" "}
        <strong className="font-medium text-slate-800">Mapping</strong> tab — not here. Evidence stays focused on
        uploading sources and running analysis.
      </div>
    </section>
  );
}

function SourceNotebookTeaser({
  chunkCount,
  onOpen,
  disabled,
}: {
  chunkCount: number;
  onOpen: () => void;
  disabled: boolean;
}) {
  const ready = chunkCount > 0 && !disabled;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white shadow-sm">
      <SectionHeader
        step="2"
        title="Source notebook"
        description="Query indexed workshop materials in plain language. Answers include citation links to exact source excerpts."
        icon={<MessageCircle className="h-5 w-5" />}
      />
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-slate-600">
          {ready
            ? "Your sources are indexed and ready. Open the source notebook to ask follow-up questions — use the chat button at the bottom right anytime."
            : "Upload readable sources in Step 1 first. They are vector-indexed on upload and become queryable in the notebook."}
        </p>
        <Button
          type="button"
          disabled={!ready}
          onClick={onOpen}
          className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <MessageCircle className="h-4 w-4" />
          Open source notebook
        </Button>
      </div>
    </section>
  );
}

export function WorkshopCaptureWorkspace({
  assessmentId,
  evidence,
  saving,
  analysisSummary,
  analysisStale,
  lastAnalyzedAt,
  analysisError,
  onUploadFiles,
  onDeleteFile,
  onAnalyzeAll,
  onGoToMapping,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [indexStats, setIndexStats] = useState<IndexStats>({ chunkCount: 0, sourceCount: 0, totalChars: 0 });
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const captureFiles = useMemo(
    () => evidence.filter((f) => isAnalyzableEvidence(f.description, f.extractedText)),
    [evidence]
  );
  const allFiles = evidence;
  const readyCount = captureFiles.filter((f) => f.extractedText?.trim()).length;
  const isAnalyzing = saving === "transcripts";
  const isUploading = saving === "uploading";
  const hasAnalysis = Boolean(analysisSummary);
  const hasResults = Boolean(analysisSummary && analysisSummary.mappings.length > 0);
  const isResultsMode = hasResults;
  const needsReanalyze = hasAnalysis && analysisStale;
  const analysisUpToDate = hasAnalysis && !analysisStale;

  useEffect(() => {
    if (isResultsMode) setSourcesExpanded(false);
  }, [isResultsMode]);

  const analyzedLabel = lastAnalyzedAt
    ? new Date(lastAnalyzedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const refreshIndexStats = useCallback(() => {
    fetch(`/api/assessments/${assessmentId}/capture`)
      .then((r) => r.json())
      .then((data: IndexStats) => {
        setIndexStats({
          chunkCount: data.chunkCount ?? 0,
          sourceCount: data.sourceCount ?? 0,
          totalChars: data.totalChars ?? 0,
        });
      })
      .catch(() => undefined);
  }, [assessmentId]);

  useEffect(() => {
    refreshIndexStats();
  }, [refreshIndexStats, evidence.length, saving]);

  const evidenceTexts = useMemo(() => {
    const map: Record<string, { fileName: string; text: string }> = {};
    for (const f of captureFiles) {
      if (f.extractedText?.trim()) map[f.id] = { fileName: f.fileName, text: f.extractedText };
    }
    return map;
  }, [captureFiles]);

  const mappedControlCount = analysisSummary?.controlsMapped ?? analysisSummary?.mappings.length ?? 0;

  function scrollToPipelineSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePipelineStepClick(stepId: EvidencePipelineStepId) {
    switch (stepId) {
      case "upload":
      case "index":
        setSourcesExpanded(true);
        scrollToPipelineSection("pipeline-upload");
        break;
      case "analyze":
        scrollToPipelineSection(isResultsMode ? "pipeline-analyze-results" : "pipeline-analyze");
        break;
      case "review_mapping":
        onGoToMapping();
        break;
    }
  }

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list);
      if (files.length === 0) return;
      await onUploadFiles(files);
    },
    [onUploadFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const sourcesPanelContent = (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Files</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{captureFiles.length}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ready</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{readyCount}</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600/90">Indexed chunks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{indexStats.chunkCount}</p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-10 transition-all ${
          dragOver
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-200 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 shadow-inner">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          ) : (
            <Upload className="h-6 w-6 text-indigo-600" />
          )}
        </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">Drop files or click to upload</p>
          <p className="mt-1 text-xs text-slate-500">
            Workshop transcripts, policies, procedures, audit records — AI classifies each file on upload
          </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {allFiles.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="hidden px-4 py-3 sm:table-cell">Type</th>
                <th className="hidden px-4 py-3 sm:table-cell">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allFiles.map((file) => {
                const indexed = Boolean(file.extractedText?.trim());
                const kind = parseEvidenceKind(file.description ?? null);
                return (
                  <tr key={file.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {fileIcon(file.fileName)}
                        <span className="font-medium text-slate-800">{file.fileName}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {kind ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {evidenceKindLabel(kind)}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{formatBytes(file.fileSize)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          indexed
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }
                      >
                        {indexed ? "Indexed" : "Unreadable"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingId(file.id);
                          void Promise.resolve(onDeleteFile(file.id)).finally(() => setDeletingId(null));
                        }}
                        disabled={deletingId === file.id}
                        className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        aria-label={`Remove ${file.fileName}`}
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const onboardingSourcesSection = (
    <section id="pipeline-upload" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm scroll-mt-6">
      <SectionHeader
        step="1"
        title="Source library"
        description={`Upload workshop notes, policies, procedures, and supporting records. Accepted: ${ACCEPT_LABEL}. Files are classified, text-extracted, and indexed on upload.`}
        icon={<Upload className="h-5 w-5" />}
      />
      <div className="p-6">{sourcesPanelContent}</div>
    </section>
  );

  const onboardingAnalyzeSection = (
    <section
      id="pipeline-analyze"
      className={`overflow-hidden rounded-2xl border shadow-lg scroll-mt-6 ${
        analysisUpToDate
          ? "border-emerald-200/80 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-200"
          : needsReanalyze
            ? "border-amber-200/80 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-200"
            : "border-indigo-200/60 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-200"
      }`}
    >
      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            {analysisUpToDate ? <CheckCircle2 className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </div>
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                analysisUpToDate ? "text-emerald-200" : needsReanalyze ? "text-amber-100" : "text-indigo-200"
              }`}
            >
              Step 3
            </p>
            <h3 className="mt-0.5 text-xl font-semibold">
              {analysisUpToDate
                ? "Analysis up to date"
                : needsReanalyze
                  ? "New sources — re-analyze recommended"
                  : "Run governance analysis"}
            </h3>
            <p
              className={`mt-2 max-w-xl text-sm leading-relaxed ${
                analysisUpToDate ? "text-emerald-100" : needsReanalyze ? "text-amber-50" : "text-indigo-100"
              }`}
            >
              {analysisUpToDate ? (
                <>
                  Results are saved and restored on refresh. Last analyzed
                  {analyzedLabel ? ` ${analyzedLabel}` : ""}. Re-analyze only when you add or remove sources.
                </>
              ) : needsReanalyze ? (
                <>
                  Sources changed since the last analysis. Run again to map new evidence to controls with updated
                  findings and citations.
                </>
              ) : (
                <>
                  Maps uploaded evidence to scoped controls with in-place findings, gaps, and recommendations. Each
                  claim links to source citations you can verify.
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          variant={analysisUpToDate ? "outline" : "default"}
          disabled={readyCount === 0 || isAnalyzing || isUploading}
          onClick={() => void onAnalyzeAll()}
          className={`shrink-0 gap-2 px-8 ${
            analysisUpToDate
              ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
              : "bg-white text-indigo-700 hover:bg-indigo-50"
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : analysisUpToDate ? (
            <>
              <Sparkles className="h-4 w-4" />
              Re-analyze
            </>
          ) : needsReanalyze ? (
            <>
              <Sparkles className="h-4 w-4" />
              Re-analyze {readyCount} source{readyCount === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyze {readyCount} source{readyCount === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>
    </section>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f6f7f9]">
      {/* Top bar */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Evidence pipeline</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isResultsMode ? "Analysis complete" : "Upload sources & analyze"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {isResultsMode
                ? "Sources are mapped to controls. Open Mapping to review findings, citations, and traceability scores."
                : "Upload workshop transcripts, run governance analysis, then review traceability in the Mapping tab."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isResultsMode && indexStats.chunkCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setChatOpen(true)}
                disabled={isAnalyzing || isUploading}
                className="gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4" />
                Ask sources
              </Button>
            )}
            {isResultsMode && analyzedLabel && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                Analyzed {analyzedLabel}
              </span>
            )}
            {isResultsMode && analysisSummary && (
              <Button onClick={onGoToMapping} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                Open Mapping
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {!isResultsMode && (
          <div className="mt-5">
            <EvidencePipelineStepper
              readyCount={readyCount}
              hasIndex={indexStats.chunkCount > 0}
              hasAnalysis={hasAnalysis}
              analysisStale={analysisStale}
              mappedControlCount={mappedControlCount}
              onStepClick={handlePipelineStepClick}
            />
          </div>
        )}
        {isResultsMode && (
          <div className="mt-5">
            <EvidencePipelineStepper
              readyCount={readyCount}
              hasIndex={indexStats.chunkCount > 0}
              hasAnalysis={hasAnalysis}
              analysisStale={analysisStale}
              mappedControlCount={mappedControlCount}
              onStepClick={handlePipelineStepClick}
              compact
            />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {isResultsMode && analysisSummary ? (
            <div className="space-y-6">
              {needsReanalyze && (
                <div
                  id="pipeline-analyze-results"
                  className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-950">Sources changed since last analysis</p>
                      <p className="mt-1 text-sm text-amber-900/80">
                        Re-analyze to refresh control mappings, or expand source library below to manage files.
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={readyCount === 0 || isAnalyzing || isUploading}
                    onClick={() => void onAnalyzeAll()}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700"
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-analyze sources"}
                  </Button>
                </div>
              )}

              <div className="space-y-5">
                <AnalysisCompleteCard summary={analysisSummary} onOpenMapping={onGoToMapping} />

                {analysisSummary.auditTrail && <AnalysisAuditTrail audit={analysisSummary.auditTrail} />}

                {analysisSummary.topicsNotDiscussed.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h4 className="text-sm font-semibold text-slate-800">Not yet covered in uploaded sources</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {analysisSummary.topicsNotDiscussed.map((topic) => (
                          <Badge
                            key={topic}
                            variant="outline"
                            className="border-slate-200 bg-slate-50 px-3 py-1 text-xs font-normal text-slate-600"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <FollowUpQuestionsExportButton assessmentId={assessmentId} />
                  </div>
              </div>

              <section id="pipeline-upload" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm scroll-mt-6">
                <button
                  type="button"
                  onClick={() => setSourcesExpanded((v) => !v)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Source library & analysis</p>
                      <p className="text-xs text-slate-500">
                        {captureFiles.length} file{captureFiles.length === 1 ? "" : "s"} · {readyCount} ready ·{" "}
                        {indexStats.chunkCount} indexed chunks
                        {analysisUpToDate ? " · analysis up to date" : ""}
                      </p>
                    </div>
                  </div>
                  {sourcesExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                {sourcesExpanded && (
                  <div className="border-t border-slate-100 p-6">
                    {sourcesPanelContent}
                    {!needsReanalyze && (
                      <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <p className="text-sm text-emerald-900">
                            Analysis is current{analyzedLabel ? ` (last run ${analyzedLabel})` : ""}.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={readyCount === 0 || isAnalyzing || isUploading}
                          onClick={() => void onAnalyzeAll()}
                        >
                          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-analyze"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              {onboardingSourcesSection}
              <SourceNotebookTeaser
                chunkCount={indexStats.chunkCount}
                disabled={isAnalyzing || isUploading}
                onOpen={() => setChatOpen(true)}
              />
              {onboardingAnalyzeSection}
              {analysisError && (
                <div className="flex gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <AlertCircle className="h-6 w-6 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold text-rose-900">Analysis failed</p>
                    <p className="mt-1 text-sm text-rose-800">{analysisError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <SourceNotebookChatLauncher
            assessmentId={assessmentId}
            chunkCount={indexStats.chunkCount}
            disabled={isAnalyzing || isUploading}
            evidenceTexts={evidenceTexts}
            open={chatOpen}
            onOpenChange={setChatOpen}
          />
        </div>
      </div>
    </div>
  );
}
