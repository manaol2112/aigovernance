"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CitedAnalysis, CitationReferenceBar, SourceEvidenceDialog, type Citation } from "@/components/cited-analysis";
import { openSharedEvidenceCitation, useEvidenceDrawer } from "@/components/evidence-drawer";
import type { CaptureQueryCitation, CaptureQueryHistoryItem } from "@/lib/capture-qa";

type QueryHistoryItem = CaptureQueryHistoryItem;

export function CaptureSourceQueryPanel({
  assessmentId,
  chunkCount,
  disabled,
  evidenceTexts,
  variant = "default",
  embedded = false,
  suggestedPrompts,
  contextHint,
}: {
  assessmentId: string;
  chunkCount: number;
  disabled: boolean;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  variant?: "default" | "hero";
  embedded?: boolean;
  suggestedPrompts?: string[];
  /** Optional subtitle shown under the hero header (e.g. current control being validated). */
  contextHint?: string;
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
  const evidenceDrawer = useEvidenceDrawer();

  function openEvidenceCitation(index: number) {
    setActiveCitation(index);
    const cite = citations.find((c) => c.citationIndex === index) ?? null;
    if (!openSharedEvidenceCitation(evidenceDrawer, cite as Citation | null)) {
      setEvidenceDialogOpen(true);
    }
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
      setHistory((prev) =>
        [
          { question: q, answer: data.answer, citations: data.citations ?? [], askedAt: new Date().toISOString() },
          ...prev,
        ].slice(0, 10)
      );
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

  const suggested = suggestedPrompts ?? [
    "What did they say about model validation?",
    "Which policies are documented vs informal?",
    "What governance gaps were admitted?",
    "Who owns AI risk oversight?",
  ];

  const isHero = variant === "hero";
  const shellClass = embedded
    ? "flex min-h-0 flex-1 flex-col"
    : `flex flex-col overflow-hidden rounded-2xl shadow-sm ${
        isHero ? "border border-slate-200/90 bg-white" : "border border-slate-200/80 bg-white"
      }`;

  return (
    <div className={shellClass}>
      {isHero ? (
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Source notebook</p>
              <h3 className="mt-0.5 text-xl font-semibold tracking-tight">Ask anything about your sources</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300/95">
                Query workshop materials in plain language while validating findings. Every answer includes citation
                links to the exact source excerpt — no re-analysis required.
              </p>
              {contextHint && (
                <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-200">{contextHint}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Step 2</p>
              <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">Ask your sources</h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
                Query indexed workshop materials without re-running analysis. Answers include citation bubbles you can
                verify against source documents.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col space-y-5 p-6">
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
                  ? "e.g. What evidence supports this control finding?"
                  : "What did the workshop cover about risk management?"
              }
              className={`w-full rounded-xl border py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:opacity-50 ${
                isHero
                  ? "border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-100"
                  : "border-slate-200 bg-slate-50/50 focus:border-indigo-400 focus:bg-white focus:ring-indigo-100"
              }`}
            />
          </div>
          <Button
            type="button"
            size="lg"
            disabled={disabled || loading || chunkCount === 0 || !question.trim()}
            onClick={() => void ask()}
            className="w-full shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {loading ? "Searching sources…" : "Ask sources"}
          </Button>
        </div>

        {chunkCount === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Upload readable sources in Evidence &amp; Analysis — they are vector-indexed automatically and become
            queryable here.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {suggested.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled || loading || chunkCount === 0}
              onClick={() => setQuestion(s)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
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
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Your question</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">{lastQuestion}</p>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Answer</p>
            <div
              className={`rounded-2xl border p-5 ${
                isHero ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50/60"
              }`}
            >
              <CitedAnalysis
                text={answer}
                citations={citations}
                activeCitation={activeCitation}
                onCitationClick={openEvidenceCitation}
                className="text-[15px] leading-relaxed"
              />
              <CitationReferenceBar
                citations={citations}
                activeCitation={activeCitation}
                onCitationClick={openEvidenceCitation}
                className="mt-4"
              />
              {citations.length === 0 && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  No source excerpts were linked to this answer — treat unverified statements with caution.
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">Click a citation number to open the source excerpt.</p>
            </div>
            {!evidenceDrawer && (
              <SourceEvidenceDialog
                open={evidenceDialogOpen}
                onOpenChange={setEvidenceDialogOpen}
                citation={activeCitationObj}
                workshopNotes=""
                facilitatorNotes=""
                evidenceTexts={evidenceTexts}
              />
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className={`border-t pt-4 ${isHero ? "border-slate-200" : "border-slate-100"}`}>
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
                    setCitations(item.citations ?? []);
                    setLastQuestion(item.question);
                    setActiveCitation(null);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    isHero
                      ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      : "border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{item.question}</p>
                  {!answer && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.answer}</p>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SourceNotebookChatLauncher({
  assessmentId,
  chunkCount,
  disabled,
  evidenceTexts,
  open,
  onOpenChange,
  suggestedPrompts,
  contextHint,
}: {
  assessmentId: string;
  chunkCount: number;
  disabled: boolean;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedPrompts?: string[];
  contextHint?: string;
}) {
  const ready = chunkCount > 0 && !disabled;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        disabled={!ready}
        className={`fixed bottom-6 right-6 z-50 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full shadow-lg shadow-slate-900/20 transition-all focus:outline-none focus:ring-4 focus:ring-slate-300 ${
          ready
            ? "bg-slate-800 text-white hover:scale-105 hover:bg-slate-900 hover:shadow-xl hover:shadow-slate-900/25"
            : "cursor-not-allowed bg-slate-200 text-slate-400"
        }`}
        aria-label="Ask your sources"
        title={ready ? "Ask your sources — cited answers from workshop materials" : "Upload and index sources first"}
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2} />
        {ready && <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />}
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
              suggestedPrompts={suggestedPrompts}
              contextHint={contextHint}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
