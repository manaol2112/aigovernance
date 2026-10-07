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
import { cn } from "@/lib/utils";

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
    return <FileImage className="h-4 w-4 text-[#53565A]" />;
  }
  return <FileText className="h-4 w-4 text-[#53565A]" />;
}

function SectionHeader({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[#E3E3E3] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-brand)]">
          Step {step}
        </p>
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#666666]">{description}</p>
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
      className="overflow-hidden rounded-lg border border-[#E3E3E3] bg-white scroll-mt-6"
    >
      <div className="flex flex-col gap-3 border-b border-[#E3E3E3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#046A38]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Analysis complete
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-black">Sources mapped to controls</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#666666]">{summary.summary}</p>
        </div>
        <Button size="sm" onClick={onOpenMapping} className="shrink-0 gap-1.5">
          <GitCompare className="h-3.5 w-3.5" />
          Open mapping
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-2 px-4 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-5">
        {[
          { label: "Files", value: summary.filesProcessed },
          { label: "Mapped", value: summary.controlsMapped },
          { label: "Aligned", value: counts.aligned },
          { label: "Partial / gap", value: counts.partial + counts.gap },
          { label: "Not discussed", value: summary.topicsNotDiscussed.length },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-[#E3E3E3] bg-[#FAFAFA] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#767676]">{s.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-black">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="border-t border-[#E3E3E3] px-4 py-2.5 text-xs text-[#666666] sm:px-5">
        Review findings and citations in <span className="font-semibold text-black">Mapping</span>. This
        view stays focused on sources and analysis.
      </p>
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
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          { label: "Files", value: captureFiles.length },
          { label: "Ready", value: readyCount, accent: true },
          { label: "Indexed chunks", value: indexStats.chunkCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-[#E3E3E3] bg-[#FAFAFA] px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#767676]">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums",
                stat.accent ? "text-[#046A38]" : "text-black"
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
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
        className={cn(
          "mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 transition-colors",
          dragOver
            ? "border-black bg-[#FAFAFA]"
            : "border-[#D0D0CE] bg-[#FAFAFA]/60 hover:border-[#666666] hover:bg-[#FAFAFA]"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E3E3E3] bg-white">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-black" />
          ) : (
            <Upload className="h-5 w-5 text-black" />
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-black">Drop files or click to upload</p>
        <p className="mt-1 max-w-md text-center text-xs text-[#666666]">
          Transcripts, policies, procedures, audit records · {ACCEPT_LABEL}
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
        <div className="overflow-hidden rounded-lg border border-[#E3E3E3]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#767676]">
              <tr>
                <th className="px-3 py-2.5">File</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Type</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Size</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] bg-white">
              {allFiles.map((file) => {
                const indexed = Boolean(file.extractedText?.trim());
                const kind = parseEvidenceKind(file.description ?? null);
                return (
                  <tr key={file.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {fileIcon(file.fileName)}
                        <span className="font-medium text-black">{file.fileName}</span>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      {kind ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {evidenceKindLabel(kind)}
                        </Badge>
                      ) : (
                        <span className="text-[#A7A8AA]">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 text-[#666666] sm:table-cell">
                      {formatBytes(file.fileSize)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={
                          indexed
                            ? "border-[#86BC25]/40 bg-[#EEF7E0] text-[#046A38]"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }
                      >
                        {indexed ? "Indexed" : "Unreadable"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingId(file.id);
                          void Promise.resolve(onDeleteFile(file.id)).finally(() => setDeletingId(null));
                        }}
                        disabled={deletingId === file.id}
                        className="inline-flex rounded-md p-1.5 text-[#A7A8AA] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA]/40 lg:overflow-hidden">
      <header className="flex shrink-0 flex-col gap-2 border-b border-[#E3E3E3] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <EvidencePipelineStepper
          readyCount={readyCount}
          hasIndex={indexStats.chunkCount > 0}
          hasAnalysis={hasAnalysis}
          analysisStale={analysisStale}
          mappedControlCount={mappedControlCount}
          onStepClick={handlePipelineStepClick}
          compact
          className="min-w-0 flex-1"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <p className="text-[11px] tabular-nums text-[#666666]">
            <span className="font-semibold text-black">{readyCount}</span>
            {" / "}
            {captureFiles.length || 0} ready
          </p>
          {indexStats.chunkCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setChatOpen(true)}
              disabled={isAnalyzing || isUploading}
              className="h-7 gap-1.5 text-xs"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Ask sources
            </Button>
          )}
          {isResultsMode && (
            <Button type="button" size="sm" onClick={onGoToMapping} className="h-7 gap-1.5 text-xs">
              Mapping
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 [scrollbar-width:thin] sm:px-4">
        {isResultsMode && analysisSummary ? (
          <>
            {needsReanalyze && (
              <div
                id="pipeline-analyze-results"
                className="flex scroll-mt-6 flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-950">Sources changed since last analysis</p>
                    <p className="mt-0.5 text-xs text-amber-900/80">
                      Re-analyze to refresh mappings, or expand the source library below.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={readyCount === 0 || isAnalyzing || isUploading}
                  onClick={() => void onAnalyzeAll()}
                  className="shrink-0"
                >
                  {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-analyze"}
                </Button>
              </div>
            )}

            <AnalysisCompleteCard summary={analysisSummary} onOpenMapping={onGoToMapping} />

            {analysisSummary.auditTrail && <AnalysisAuditTrail audit={analysisSummary.auditTrail} />}

            {analysisSummary.topicsNotDiscussed.length > 0 && (
              <div className="rounded-lg border border-[#E3E3E3] bg-white px-4 py-3">
                <h4 className="text-sm font-semibold text-black">Not yet covered in uploaded sources</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysisSummary.topicsNotDiscussed.map((topic) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className="border-[#E3E3E3] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-normal text-[#53565A]"
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

            <section
              id="pipeline-upload"
              className="overflow-hidden rounded-lg border border-[#E3E3E3] bg-white scroll-mt-6"
            >
              <button
                type="button"
                onClick={() => setSourcesExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#FAFAFA] sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <FolderOpen className="h-4 w-4 shrink-0 text-[#53565A]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black">Source library</p>
                    <p className="truncate text-[11px] text-[#666666]">
                      {captureFiles.length} file{captureFiles.length === 1 ? "" : "s"} · {readyCount} ready ·{" "}
                      {indexStats.chunkCount} chunks
                      {analyzedLabel ? ` · analyzed ${analyzedLabel}` : ""}
                    </p>
                  </div>
                </div>
                {sourcesExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-[#A7A8AA]" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#A7A8AA]" />
                )}
              </button>
              {sourcesExpanded && (
                <div className="border-t border-[#E3E3E3] px-4 py-4 sm:px-5">
                  {sourcesPanelContent}
                  {!needsReanalyze && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#86BC25]/35 bg-[#EEF7E0]/50 px-3 py-2.5">
                      <p className="flex items-center gap-2 text-xs text-[#046A38]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Analysis is current{analyzedLabel ? ` (last run ${analyzedLabel})` : ""}.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={readyCount === 0 || isAnalyzing || isUploading}
                        onClick={() => void onAnalyzeAll()}
                      >
                        {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-analyze"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section
              id="pipeline-upload"
              className="overflow-hidden rounded-lg border border-[#E3E3E3] bg-white scroll-mt-6"
            >
              <SectionHeader
                step="1"
                title="Source library"
                description={`Upload workshop notes, policies, procedures, and supporting records (${ACCEPT_LABEL}). Files are classified and indexed on upload.`}
              />
              <div className="px-4 py-4 sm:px-5">{sourcesPanelContent}</div>
            </section>

            <section className="overflow-hidden rounded-lg border border-[#E3E3E3] bg-white">
              <SectionHeader
                step="2"
                title="Source notebook"
                description="Query indexed materials in plain language. Answers include citation links to source excerpts."
              />
              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="max-w-xl text-xs text-[#666666]">
                  {indexStats.chunkCount > 0
                    ? "Sources are indexed. Open the notebook to ask follow-up questions."
                    : "Upload readable sources in Step 1 first. They are indexed on upload."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={indexStats.chunkCount === 0 || isAnalyzing || isUploading}
                  onClick={() => setChatOpen(true)}
                  className="shrink-0 gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Open notebook
                </Button>
              </div>
            </section>

            <section
              id="pipeline-analyze"
              className={cn(
                "overflow-hidden rounded-lg border scroll-mt-6",
                analysisUpToDate
                  ? "border-[#86BC25]/40 bg-[#EEF7E0]/40"
                  : needsReanalyze
                    ? "border-amber-200 bg-amber-50"
                    : "border-[#E3E3E3] bg-white"
              )}
            >
              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--theme-brand)]">
                    Step 3
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-black">
                    {analysisUpToDate
                      ? "Analysis up to date"
                      : needsReanalyze
                        ? "New sources — re-analyze recommended"
                        : "Run governance analysis"}
                  </h3>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#666666]">
                    {analysisUpToDate ? (
                      <>
                        Results restore on refresh. Last analyzed
                        {analyzedLabel ? ` ${analyzedLabel}` : ""}. Re-analyze when sources change.
                      </>
                    ) : needsReanalyze ? (
                      <>Sources changed since the last run. Re-analyze to refresh control mappings.</>
                    ) : (
                      <>
                        Map uploaded evidence to scoped controls with findings, gaps, and cited claims.
                      </>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={analysisUpToDate ? "outline" : "default"}
                  disabled={readyCount === 0 || isAnalyzing || isUploading}
                  onClick={() => void onAnalyzeAll()}
                  className="shrink-0 gap-1.5"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {analysisUpToDate || needsReanalyze ? "Re-analyze" : "Analyze"}{" "}
                      {readyCount} source{readyCount === 1 ? "" : "s"}
                    </>
                  )}
                </Button>
              </div>
            </section>

            {analysisError && (
              <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-semibold text-rose-900">Analysis failed</p>
                  <p className="mt-0.5 text-xs text-rose-800">{analysisError}</p>
                </div>
              </div>
            )}
          </>
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
  );
}
