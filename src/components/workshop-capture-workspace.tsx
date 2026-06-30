"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileImage,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CitedAnalysis, SourceEvidenceDialog, type Citation } from "@/components/cited-analysis";
import { isTranscriptEvidence } from "@/lib/transcript-evidence";
import { RISK_PILLARS } from "@/lib/risk-control-matrix";
import type { CaptureAnalysisSummary, ControlMappingEntry } from "@/lib/capture-analysis-types";
import type { CaptureQueryCitation } from "@/lib/capture-qa";

const ACCEPT =
  ".pdf,.txt,.docx,.jpeg,.jpg,.png,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";
const ACCEPT_LABEL = "PDF, TXT, Word (.docx), JPEG/PNG";

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

type PillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  pillarIndex: number;
  controls: ControlMappingEntry[];
  statusCounts: Record<ControlMappingEntry["complianceStatus"], number>;
};

const PILLAR_ORDER = new Map(RISK_PILLARS.map((p, i) => [p.id, i]));
const PILLAR_BY_ID = new Map(RISK_PILLARS.map((p) => [p.id, p]));
const PILLAR_BY_LABEL = new Map(RISK_PILLARS.map((p) => [p.label, p]));

function buildPillarGroups(mappings: ControlMappingEntry[]): PillarGroup[] {
  const map = new Map<string, ControlMappingEntry[]>();
  for (const m of mappings) {
    const key = m.pillarId || m.pillarLabel;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }

  const groups: PillarGroup[] = [];
  for (const [key, controls] of map) {
    const sample = controls[0];
    const def = PILLAR_BY_ID.get(sample.pillarId) ?? PILLAR_BY_LABEL.get(sample.pillarLabel);
    const statusCounts: PillarGroup["statusCounts"] = {
      aligned: 0,
      partial: 0,
      gap: 0,
      not_assessed: 0,
    };
    for (const c of controls) {
      statusCounts[c.complianceStatus] += 1;
    }
    groups.push({
      pillarId: def?.id ?? sample.pillarId ?? key,
      pillarLabel: def?.label ?? sample.pillarLabel,
      pillarDescription: def?.description ?? "",
      pillarIndex: PILLAR_ORDER.get(def?.id ?? sample.pillarId) ?? 999,
      controls: controls.sort((a, b) => a.controlCode.localeCompare(b.controlCode)),
      statusCounts,
    });
  }

  return groups.sort((a, b) => a.pillarIndex - b.pillarIndex || a.pillarLabel.localeCompare(b.pillarLabel));
}

function PillarControlNavigator({
  pillarGroups,
  selectedControlId,
  expandedPillars,
  onTogglePillar,
  onSelectControl,
}: {
  pillarGroups: PillarGroup[];
  selectedControlId: string | null;
  expandedPillars: Set<string>;
  onTogglePillar: (pillarId: string) => void;
  onSelectControl: (ctrl: ControlMappingEntry) => void;
}) {
  return (
    <div className="max-h-[560px] space-y-2 overflow-y-auto p-2">
      {pillarGroups.map((group, idx) => {
        const expanded = expandedPillars.has(group.pillarId);
        const hasSelected = group.controls.some((c) => c.controlId === selectedControlId);

        return (
          <div
            key={group.pillarId}
            className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
              hasSelected ? "border-indigo-200 ring-1 ring-indigo-100" : "border-slate-200/80"
            }`}
          >
            <button
              type="button"
              onClick={() => onTogglePillar(group.pillarId)}
              className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50/80"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-slate-900">{group.pillarLabel}</p>
                  {expanded ? (
                    <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </div>
                {group.pillarDescription && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {group.pillarDescription}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {group.controls.length} control{group.controls.length === 1 ? "" : "s"}
                  </span>
                  {group.statusCounts.aligned > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      {group.statusCounts.aligned} aligned
                    </span>
                  )}
                  {group.statusCounts.partial > 0 && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      {group.statusCounts.partial} partial
                    </span>
                  )}
                  {group.statusCounts.gap > 0 && (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      {group.statusCounts.gap} gap
                    </span>
                  )}
                </div>
              </div>
            </button>

            {expanded && (
              <div className="space-y-0.5 border-t border-slate-100 bg-slate-50/40 p-2">
                {group.controls.map((ctrl) => {
                  const selected = selectedControlId === ctrl.controlId;
                  return (
                    <button
                      key={ctrl.controlId}
                      type="button"
                      onClick={() => onSelectControl(ctrl)}
                      className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-all ${
                        selected
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-white text-slate-700 hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          selected ? "text-indigo-100" : "text-indigo-600"
                        }`}
                      >
                        {ctrl.controlCode}
                      </span>
                      <span
                        className={`mt-0.5 line-clamp-2 text-xs leading-snug ${
                          selected ? "text-indigo-50" : "text-slate-600"
                        }`}
                      >
                        {ctrl.controlTitle}
                      </span>
                      <Badge
                        variant="outline"
                        className={`mt-2 w-fit text-[9px] ${
                          selected
                            ? "border-white/30 bg-white/10 text-white"
                            : STATUS_COLORS[ctrl.complianceStatus] ?? ""
                        }`}
                      >
                        {STATUS_LABELS[ctrl.complianceStatus]}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  onGoToReview: () => void;
};

type IndexStats = { chunkCount: number; sourceCount: number; totalChars: number };
type QueryHistoryItem = { question: string; answer: string; askedAt?: string };

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return <FileImage className="h-4 w-4 text-violet-500" />;
  }
  return <FileText className="h-4 w-4 text-indigo-500" />;
}

function WorkflowRail({
  readyCount,
  hasIndex,
  hasAnalysis,
  analysisStale,
}: {
  readyCount: number;
  hasIndex: boolean;
  hasAnalysis: boolean;
  analysisStale: boolean;
}) {
  const steps = [
    { id: "sources", label: "Sources", done: readyCount > 0, detail: `${readyCount} file${readyCount === 1 ? "" : "s"}` },
    { id: "index", label: "Indexed", done: hasIndex, detail: hasIndex ? "Vector ready" : "On upload" },
    {
      id: "analyze",
      label: "Analyzed",
      done: hasAnalysis && !analysisStale,
      detail: hasAnalysis
        ? analysisStale
          ? "Re-analyze needed"
          : "Controls mapped"
        : "Pending",
    },
    { id: "review", label: "Review", done: false, detail: "Confirm in Review" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              step.done ? "bg-indigo-50 text-indigo-900" : "bg-slate-50 text-slate-500"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step.done ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div>
              <p className="text-xs font-semibold">{step.label}</p>
              <p className="text-[10px] opacity-80">{step.detail}</p>
            </div>
          </div>
          {i < steps.length - 1 && <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />}
        </div>
      ))}
    </div>
  );
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

function CitedFindingBlock({
  title,
  content,
  citations,
  activeCitation,
  onCitationClick,
  tone,
}: {
  title: string;
  content: string;
  citations: Citation[];
  activeCitation: number | null;
  onCitationClick: (index: number) => void;
  tone: "positive" | "warning" | "action";
}) {
  const styles = {
    positive: { ring: "ring-emerald-100", bg: "bg-emerald-50/40", label: "text-emerald-800", dot: "bg-emerald-500" },
    warning: { ring: "ring-amber-100", bg: "bg-amber-50/40", label: "text-amber-900", dot: "bg-amber-500" },
    action: { ring: "ring-indigo-100", bg: "bg-indigo-50/35", label: "text-indigo-900", dot: "bg-indigo-500" },
  }[tone];

  return (
    <div className={`rounded-xl p-4 ring-1 ${styles.ring} ${styles.bg}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{title}</p>
      </div>
      <CitedAnalysis
        text={content}
        citations={citations}
        activeCitation={activeCitation}
        onCitationClick={onCitationClick}
        className="text-[15px] leading-relaxed text-slate-800"
      />
    </div>
  );
}

function CaptureSourceQueryPanel({
  assessmentId,
  chunkCount,
  disabled,
  evidenceTexts,
  variant = "default",
  embedded = false,
}: {
  assessmentId: string;
  chunkCount: number;
  disabled: boolean;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  variant?: "default" | "hero";
  embedded?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<CaptureQueryCitation[]>([]);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  function openEvidenceCitation(index: number) {
    setActiveCitation(index);
    setEvidenceDialogOpen(true);
  }

  useEffect(() => {
    fetch(`/api/assessments/${assessmentId}/capture`)
      .then((r) => r.json())
      .then((data: { queries?: QueryHistoryItem[] }) => {
        if (Array.isArray(data.queries)) setHistory(data.queries);
      })
      .catch(() => undefined);
  }, [assessmentId]);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setActiveCitation(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "query", question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Query failed");
      setAnswer(data.answer);
      setCitations(data.citations ?? []);
      setLastQuestion(q);
      setHistory((prev) => [{ question: q, answer: data.answer }, ...prev].slice(0, 10));
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  const activeCitationObj = useMemo((): Citation | null => {
    if (activeCitation == null) return null;
    return citations.find((c) => c.citationIndex === activeCitation) ?? null;
  }, [activeCitation, citations]);

  const suggested = [
    "What did they say about model validation?",
    "Which policies are documented vs informal?",
    "What governance gaps were admitted?",
    "Who owns AI risk oversight?",
  ];

  const isHero = variant === "hero";
  const shellClass = embedded
    ? "flex min-h-0 flex-1 flex-col"
    : `flex flex-col overflow-hidden rounded-2xl shadow-sm ${
        isHero
          ? "border-2 border-violet-200/90 bg-gradient-to-b from-violet-50/80 via-white to-white ring-4 ring-violet-100/50"
          : "border border-slate-200/80 bg-white"
      }`;

  return (
    <div className={shellClass}>
      {isHero ? (
        <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-200">Source notebook</p>
              <h3 className="mt-0.5 text-xl font-semibold tracking-tight">Ask anything about your sources</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-violet-100/90">
                Your team can query workshop materials in plain language. Every answer includes citation links to the
                exact source excerpt — no re-analysis required.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <SectionHeader
          step="2"
          title="Ask your sources"
          description="Query indexed workshop materials without re-running analysis. Answers include citation bubbles you can verify against source documents."
          icon={<MessageCircle className="h-5 w-5" />}
        />
      )}
      <div className={`flex min-h-0 flex-1 flex-col space-y-5 ${isHero ? "p-6" : "p-6"}`}>
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void ask()}
              disabled={disabled || loading || chunkCount === 0}
              placeholder={
                isHero
                  ? "e.g. What did leadership say about third-party AI vendors?"
                  : "What did the workshop cover about risk management?"
              }
              className={`w-full rounded-xl border py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                isHero
                  ? "border-violet-200 bg-white focus:border-violet-400 focus:ring-violet-100"
                  : "border-slate-200 bg-slate-50/50 focus:border-violet-400 focus:bg-white focus:ring-violet-100"
              }`}
            />
          </div>
          <Button
            type="button"
            size="lg"
            disabled={disabled || loading || chunkCount === 0 || !question.trim()}
            onClick={() => void ask()}
            className={`w-full shrink-0 gap-2 ${isHero ? "bg-violet-600 hover:bg-violet-700" : "bg-violet-600 px-8 hover:bg-violet-700"}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {loading ? "Searching sources…" : "Ask sources"}
          </Button>
        </div>

        {chunkCount === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Upload readable sources in Step 1 — they are vector-indexed automatically and become queryable here.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {suggested.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled || loading || chunkCount === 0}
              onClick={() => setQuestion(s)}
              className="rounded-full border border-violet-100 bg-violet-50/50 px-3 py-1.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-100 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
        )}

        {answer && lastQuestion && (
          <div className="min-h-0 flex-1">
            <div className="mb-3 rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Your question</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">{lastQuestion}</p>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Answer</p>
            <div
              className={`rounded-2xl border p-5 ${
                isHero ? "border-violet-100 bg-white shadow-inner" : "border-slate-100 bg-slate-50/60"
              }`}
            >
              <CitedAnalysis
                text={answer}
                citations={citations}
                activeCitation={activeCitation}
                onCitationClick={openEvidenceCitation}
                className="text-[15px] leading-relaxed"
              />
              <p className="mt-3 text-xs text-violet-600/80">
                Click a citation number to open the source excerpt.
              </p>
            </div>
            <SourceEvidenceDialog
              open={evidenceDialogOpen}
              onOpenChange={setEvidenceDialogOpen}
              citation={activeCitationObj}
              workshopNotes=""
              facilitatorNotes=""
              evidenceTexts={evidenceTexts}
            />
          </div>
        )}

        {history.length > 0 && (
          <div className={`border-t pt-4 ${isHero ? "border-violet-100" : "border-slate-100"}`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {answer ? "Earlier questions" : "Recent questions"}
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {(answer ? history.slice(1) : history).slice(0, 6).map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuestion(item.question);
                    setAnswer(item.answer);
                    setCitations([]);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    isHero
                      ? "border-violet-100/80 bg-white hover:border-violet-200 hover:bg-violet-50/30"
                      : "border-slate-100 bg-slate-50/50 hover:border-violet-200 hover:bg-violet-50/40"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{item.question}</p>
                  {!answer && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.answer}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceNotebookChatLauncher({
  assessmentId,
  chunkCount,
  disabled,
  evidenceTexts,
  open,
  onOpenChange,
}: {
  assessmentId: string;
  chunkCount: number;
  disabled: boolean;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ready = chunkCount > 0 && !disabled;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        disabled={!ready}
        className={`fixed bottom-6 right-6 z-50 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full shadow-lg shadow-violet-900/20 transition-all focus:outline-none focus:ring-4 focus:ring-violet-200 ${
          ready
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:scale-105 hover:shadow-xl hover:shadow-violet-500/30"
            : "cursor-not-allowed bg-slate-200 text-slate-400"
        }`}
        aria-label="Ask your sources"
        title={ready ? "Ask your sources — cited answers from workshop materials" : "Upload and index sources first"}
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2} />
        {ready && (
          <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,780px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CaptureSourceQueryPanel
              assessmentId={assessmentId}
              chunkCount={chunkCount}
              disabled={disabled}
              evidenceTexts={evidenceTexts}
              variant="hero"
              embedded
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
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
    <section className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50/50 to-white shadow-sm">
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
          className="shrink-0 gap-2 bg-violet-600 hover:bg-violet-700"
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
  onGoToReview,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [indexStats, setIndexStats] = useState<IndexStats>({ chunkCount: 0, sourceCount: 0, totalChars: 0 });
  const [traceSelection, setTraceSelection] = useState<{
    controlId: string;
    citationIndex: number;
  } | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());

  const captureFiles = useMemo(
    () => evidence.filter((f) => isTranscriptEvidence(f.description)),
    [evidence]
  );
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

  useEffect(() => {
    if (!analysisSummary?.mappings.length) return;
    setSelectedControlId((prev) => prev ?? analysisSummary.mappings[0].controlId);
  }, [analysisSummary]);

  const evidenceTexts = useMemo(() => {
    const map: Record<string, { fileName: string; text: string }> = {};
    for (const f of captureFiles) {
      if (f.extractedText?.trim()) map[f.id] = { fileName: f.fileName, text: f.extractedText };
    }
    return map;
  }, [captureFiles]);

  const pillarGroups = useMemo(
    () => (analysisSummary ? buildPillarGroups(analysisSummary.mappings) : []),
    [analysisSummary]
  );

  useEffect(() => {
    if (pillarGroups.length === 0) return;
    setExpandedPillars((prev) => {
      if (prev.size > 0) return prev;
      return new Set(pillarGroups.map((g) => g.pillarId));
    });
  }, [pillarGroups]);

  useEffect(() => {
    if (!selectedControlId || pillarGroups.length === 0) return;
    const group = pillarGroups.find((g) => g.controls.some((c) => c.controlId === selectedControlId));
    if (group) {
      setExpandedPillars((prev) => new Set([...prev, group.pillarId]));
    }
  }, [selectedControlId, pillarGroups]);

  function togglePillar(pillarId: string) {
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(pillarId)) next.delete(pillarId);
      else next.add(pillarId);
      return next;
    });
  }

  const selectedPillarGroup = useMemo(
    () => pillarGroups.find((g) => g.controls.some((c) => c.controlId === selectedControlId)) ?? null,
    [pillarGroups, selectedControlId]
  );

  const selectedControl = useMemo(
    () => analysisSummary?.mappings.find((m) => m.controlId === selectedControlId) ?? null,
    [analysisSummary, selectedControlId]
  );

  const activeCitationObj = useMemo((): Citation | null => {
    if (!traceSelection || !analysisSummary) return null;
    const ctrl = analysisSummary.mappings.find((m) => m.controlId === traceSelection.controlId);
    return ctrl?.citations.find((c) => c.citationIndex === traceSelection.citationIndex) ?? null;
  }, [traceSelection, analysisSummary]);

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

  function selectControl(ctrl: ControlMappingEntry) {
    setSelectedControlId(ctrl.controlId);
    setTraceSelection(null);
    setEvidenceDialogOpen(false);
  }

  function openControlCitation(controlId: string, citationIndex: number) {
    setTraceSelection({ controlId, citationIndex });
    setEvidenceDialogOpen(true);
  }

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
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">Indexed chunks</p>
          <p className="mt-1 text-2xl font-bold text-violet-900">{indexStats.chunkCount}</p>
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
        <p className="mt-3 text-sm font-semibold text-slate-800">Add more files</p>
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

      {captureFiles.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="hidden px-4 py-3 sm:table-cell">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {captureFiles.map((file) => {
                const indexed = Boolean(file.extractedText?.trim());
                return (
                  <tr key={file.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {fileIcon(file.fileName)}
                        <span className="font-medium text-slate-800">{file.fileName}</span>
                      </div>
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
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <SectionHeader
        step="1"
        title="Source library"
        description={`Upload workshop transcripts and supporting files. Accepted: ${ACCEPT_LABEL}. Text is extracted and vector-indexed on upload.`}
        icon={<Upload className="h-5 w-5" />}
      />
      <div className="p-6">{sourcesPanelContent}</div>
    </section>
  );

  const onboardingAnalyzeSection = (
    <section
      className={`overflow-hidden rounded-2xl border shadow-lg ${
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
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Workshop capture</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {isResultsMode ? "Governance analysis & source notebook" : "Evidence intake & control mapping"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {isResultsMode
                ? "Review control findings below. Use the chat button to ask follow-up questions against your sources with cited evidence."
                : "Upload sources, query them like a notebook, then run governance analysis with full evidence traceability."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isResultsMode && indexStats.chunkCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setChatOpen(true)}
                disabled={isAnalyzing || isUploading}
                className="gap-2 border-violet-200 bg-violet-50/50 text-violet-800 hover:bg-violet-100"
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
            {analysisSummary && (
              <Button onClick={onGoToReview} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                Continue to Review
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {!isResultsMode && (
          <div className="mx-auto mt-5 max-w-[1440px]">
            <WorkflowRail
              readyCount={readyCount}
              hasIndex={indexStats.chunkCount > 0}
              hasAnalysis={hasAnalysis}
              analysisStale={analysisStale}
            />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1440px] px-6 py-6">
          {isResultsMode && analysisSummary ? (
            <div className="space-y-6">
              {needsReanalyze && (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                  <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-6 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                              Control mapping results
                            </p>
                            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">Workshop analysis</h3>
                            <p className="mt-1 max-w-3xl text-sm text-slate-600">{analysisSummary.summary}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Files", value: analysisSummary.filesProcessed },
                          { label: "Controls", value: analysisSummary.controlsMapped },
                          { label: "Risk pillars", value: pillarGroups.length },
                          { label: "Not discussed", value: analysisSummary.topicsNotDiscussed.length },
                        ].map((s) => (
                          <div key={s.label} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
                          </div>
                        ))}
                      </div>
                      {pillarGroups.length > 0 && (
                        <div className="mt-4 border-t border-emerald-100/80 pt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
                            Risk pillars in this analysis
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pillarGroups.map((g) => (
                              <button
                                key={g.pillarId}
                                type="button"
                                onClick={() => {
                                  setExpandedPillars((prev) => new Set([...prev, g.pillarId]));
                                  if (g.controls[0]) selectControl(g.controls[0]);
                                }}
                                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
                              >
                                {g.pillarLabel}
                                <span className="ml-1.5 text-emerald-600/70">({g.controls.length})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid min-h-[640px] lg:grid-cols-12">
                      <aside className="border-b border-slate-100 bg-slate-50/50 lg:col-span-4 lg:border-b-0 lg:border-r">
                        <div className="sticky top-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3 backdrop-blur-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <Layers className="h-3.5 w-3.5" />
                              Risk pillars & controls
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPillars(
                                  expandedPillars.size === pillarGroups.length
                                    ? new Set()
                                    : new Set(pillarGroups.map((g) => g.pillarId))
                                )
                              }
                              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              {expandedPillars.size === pillarGroups.length ? "Collapse all" : "Expand all"}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {pillarGroups.length} pillar{pillarGroups.length === 1 ? "" : "s"} ·{" "}
                            {analysisSummary.controlsMapped} controls assessed
                          </p>
                        </div>
                        <PillarControlNavigator
                          pillarGroups={pillarGroups}
                          selectedControlId={selectedControlId}
                          expandedPillars={expandedPillars}
                          onTogglePillar={togglePillar}
                          onSelectControl={selectControl}
                        />
                      </aside>

                      <div className="lg:col-span-8">
                        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <BookOpen className="h-3.5 w-3.5" />
                            Control assessment
                          </div>
                        </div>
                        <div className="p-5">
                          {selectedControl ? (
                            <div className="space-y-4">
                              <div>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    {selectedPillarGroup && (
                                      <div className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                          Risk pillar
                                        </p>
                                        <p className="mt-0.5 text-sm font-semibold text-indigo-950">
                                          {selectedPillarGroup.pillarLabel}
                                        </p>
                                        {selectedPillarGroup.pillarDescription && (
                                          <p className="mt-1 text-xs leading-relaxed text-indigo-900/70">
                                            {selectedPillarGroup.pillarDescription}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    <span className="font-mono text-sm font-bold text-indigo-700">
                                      {selectedControl.controlCode}
                                    </span>
                                    <h4 className="mt-1 text-lg font-semibold text-slate-900">
                                      {selectedControl.controlTitle}
                                    </h4>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs uppercase ${STATUS_COLORS[selectedControl.complianceStatus] ?? ""}`}
                                  >
                                    {STATUS_LABELS[selectedControl.complianceStatus]}
                                  </Badge>
                                </div>
                                {selectedControl.controlDescription && (
                                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      Control requirement
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                      {selectedControl.controlDescription}
                                    </p>
                                  </div>
                                )}
                                {selectedControl.sourceFiles.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {selectedControl.sourceFiles.map((f) => (
                                      <Badge key={f} variant="outline" className="text-[10px] font-normal">
                                        {f}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <CitedFindingBlock
                                title="In place"
                                content={selectedControl.inPlaceFindings}
                                citations={selectedControl.citations}
                                activeCitation={
                                  traceSelection?.controlId === selectedControl.controlId
                                    ? traceSelection.citationIndex
                                    : null
                                }
                                onCitationClick={(index) =>
                                  openControlCitation(selectedControl.controlId, index)
                                }
                                tone="positive"
                              />
                              <CitedFindingBlock
                                title="Gaps"
                                content={selectedControl.gapFindings}
                                citations={selectedControl.citations}
                                activeCitation={
                                  traceSelection?.controlId === selectedControl.controlId
                                    ? traceSelection.citationIndex
                                    : null
                                }
                                onCitationClick={(index) =>
                                  openControlCitation(selectedControl.controlId, index)
                                }
                                tone="warning"
                              />
                              <CitedFindingBlock
                                title="Recommendations"
                                content={selectedControl.recommendations}
                                citations={selectedControl.citations}
                                activeCitation={
                                  traceSelection?.controlId === selectedControl.controlId
                                    ? traceSelection.citationIndex
                                    : null
                                }
                                onCitationClick={(index) =>
                                  openControlCitation(selectedControl.controlId, index)
                                }
                                tone="action"
                              />

                              <p className="text-xs text-slate-400">
                                Click any citation number to open source evidence in a pop-up.
                              </p>
                            </div>
                          ) : (
                            <p className="py-12 text-center text-sm text-slate-500">
                              Select a control from the list to view its assessment.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

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
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
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

          <SourceEvidenceDialog
            open={evidenceDialogOpen}
            onOpenChange={setEvidenceDialogOpen}
            citation={activeCitationObj}
            workshopNotes=""
            facilitatorNotes=""
            evidenceTexts={evidenceTexts}
          />

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
