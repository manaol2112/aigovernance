"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DeepDiveContinuationState,
  PillarDeepDiveOption,
} from "@/lib/maturity-survey-continue";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import { formatUnitCount } from "@/lib/format-unit-count";
import { toast } from "@/components/ui/toast";

function formatFollowUpQuestions(count: number): string {
  return formatUnitCount(count, "follow-up question", "follow-up questions");
}

function estimateMinutes(additionalQuestions: number) {
  if (additionalQuestions <= 0) return "~5 min";
  if (additionalQuestions <= 5) return "~10–15 min";
  if (additionalQuestions <= 12) return "~20–30 min";
  return "~30–45 min";
}

const MATURITY_BADGE: Record<string, "danger" | "warning" | "secondary" | "success"> = {
  not_implemented: "danger",
  initial: "danger",
  developing: "warning",
  defined: "secondary",
  managed: "success",
  optimized: "success",
};

function PillarDeepDiveCard({
  pillar,
  loading,
  activePillarId,
  onStart,
}: {
  pillar: PillarDeepDiveOption;
  loading: boolean;
  activePillarId: string | null;
  onStart: (pillarId: string) => void;
}) {
  const isLoading = loading && activePillarId === pillar.pillarId;
  const completed = pillar.childStatus === "completed";
  const inProgress = pillar.childStatus === "in_progress";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-5 transition-all",
        pillar.isPriorityFocus
          ? "border-emerald-400/40 bg-emerald-500/10 shadow-lg shadow-emerald-900/10"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
      )}
    >
      {pillar.isPriorityFocus && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          <Sparkles className="h-3 w-3" />
          Recommended focus
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{pillar.pillarLabel}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
            {pillar.criticality} priority
          </p>
        </div>
        <Badge variant={MATURITY_BADGE[pillar.maturityLevel] ?? "secondary"} className="shrink-0">
          {pillar.maturityLabel}
        </Badge>
      </div>

      <div className="mt-4">
        <p className="text-lg font-bold leading-tight text-white">
          {formatFollowUpQuestions(pillar.additionalControls)}
        </p>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {formatUnitCount(pillar.libraryControlCount, "framework-mapped control")} in scope · baseline
        already answered
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {completed && pillar.childSurveyId ? (
          <Button
            asChild
            size="sm"
            className="w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-400"
          >
            <Link href={`/maturity-assessment/${pillar.childSurveyId}/results`}>
              View results
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : inProgress && pillar.childSurveyId ? (
          <Button
            asChild
            size="sm"
            className="w-full rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
          >
            <Link href={`/maturity-assessment/${pillar.childSurveyId}`}>
              Continue
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : pillar.additionalControls > 0 ? (
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => onStart(pillar.pillarId)}
            className="w-full rounded-xl bg-white/10 text-white hover:bg-white/15"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                Assess this pillar
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        ) : (
          <p className="text-center text-xs text-slate-500">
            No additional framework-mapped controls for this pillar
          </p>
        )}
        <p className="text-center text-[10px] text-slate-600">
          {estimateMinutes(pillar.additionalControls)}
        </p>
      </div>
    </div>
  );
}

export function MaturityDeepDiveContinuePanel({
  surveyId,
  report,
  continuation,
}: {
  surveyId: string;
  report: MaturitySurveyReport;
  continuation: DeepDiveContinuationState;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activePillarId, setActivePillarId] = useState<string | null>(null);
  const [showFullLibrary, setShowFullLibrary] = useState(false);

  const priorityPillar = useMemo(
    () => continuation.pillars.find((pillar) => pillar.pillarId === continuation.priorityFocusPillarId),
    [continuation.pillars, continuation.priorityFocusPillarId]
  );

  const displayPillars = continuation.actionablePillars.length > 0
    ? continuation.actionablePillars
    : continuation.pillars.filter((p) => p.childStatus != null);

  const completedCount = displayPillars.filter((p) => p.childStatus === "completed").length;

  if (report.surveyMode !== "quick" || !report.scope.suggestsDeepDive) {
    return null;
  }

  async function startDeepDive(focusPillarIds: string[]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/maturity-surveys/${surveyId}/deep-dive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusPillarIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start deep dive");
      }
      toast(
        data.created
          ? `${data.prefilledCount} baseline answer${data.prefilledCount === 1 ? "" : "s"} carried forward.`
          : "Resuming your assessment.",
        { variant: "success" }
      );
      router.push(`/maturity-assessment/${data.surveyId}`);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to start assessment.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
      setActivePillarId(null);
    }
  }

  function handlePillarStart(pillarId: string) {
    setActivePillarId(pillarId);
    void startDeepDive([pillarId]);
  }

  function handlePriorityStart() {
    if (!priorityPillar) return;
    setActivePillarId(priorityPillar.pillarId);
    void startDeepDive([priorityPillar.pillarId]);
  }

  function handleFullLibraryStart() {
    setActivePillarId("__full__");
    void startDeepDive([]);
  }

  const { fullDeepDive } = continuation;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-2xl shadow-emerald-900/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_0%_0%,rgba(16,185,129,0.22),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(99,102,241,0.18),transparent)]" />

      <div className="relative px-6 py-10 sm:px-10 lg:py-12">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Detailed pillar assessment
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Go deeper where it matters — one pillar at a time
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            Your baseline scan surfaced a maturity snapshot across every pillar. Choose where to go
            deeper next — we recommend starting with the pillar that has the most room to strengthen.
            Follow-up counts reflect framework-mapped controls beyond your baseline answer for each
            pillar.
          </p>
          {continuation.pillarsFullyCoveredInBaseline > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {continuation.pillarsFullyCoveredInBaseline} pillar
              {continuation.pillarsFullyCoveredInBaseline === 1 ? "" : "s"} already fully covered by
              your baseline for the selected frameworks — omitted below.
            </p>
          )}
        </div>

        {priorityPillar && priorityPillar.additionalControls > 0 && (
          <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Target className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Recommended starting point
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {priorityPillar.pillarLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Current maturity: {priorityPillar.maturityLabel} ·{" "}
                    {formatFollowUpQuestions(priorityPillar.additionalControls)} ·{" "}
                    {estimateMinutes(priorityPillar.additionalControls)}
                  </p>
                </div>
              </div>
              {priorityPillar.childStatus === "completed" && priorityPillar.childSurveyId ? (
                <Button asChild size="lg" className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400">
                  <Link href={`/maturity-assessment/${priorityPillar.childSurveyId}/results`}>
                    View results
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : priorityPillar.childStatus === "in_progress" && priorityPillar.childSurveyId ? (
                <Button asChild size="lg" className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400">
                  <Link href={`/maturity-assessment/${priorityPillar.childSurveyId}`}>
                    Continue
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  disabled={loading}
                  onClick={handlePriorityStart}
                  className="shrink-0 gap-2 rounded-xl bg-emerald-500 px-8 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
                >
                  {loading && activePillarId === priorityPillar.pillarId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing…
                    </>
                  ) : (
                    <>
                      Assess recommended pillar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Choose a pillar</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {displayPillars.length > 0
                  ? completedCount > 0
                    ? `${completedCount} detailed assessment${completedCount === 1 ? "" : "s"} completed · ${displayPillars.length - completedCount} with follow-up questions available`
                    : `${displayPillars.length} pillar${displayPillars.length === 1 ? "" : "s"} with framework-mapped follow-up questions`
                  : "No pillars with additional follow-up questions for your selected frameworks"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Deterministic scoring · no AI findings
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayPillars.map((pillar) => (
              <PillarDeepDiveCard
                key={pillar.pillarId}
                pillar={pillar}
                loading={loading}
                activePillarId={activePillarId}
                onStart={handlePillarStart}
              />
            ))}
          </div>
          {displayPillars.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
              Every pillar in your baseline already maps to the full control set available for your
              selected frameworks. Run a new baseline after expanding frameworks or updating the
              control library to unlock deeper assessments.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setShowFullLibrary((open) => !open)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-slate-200">Full assessment (all pillars)</p>
              <p className="mt-0.5 text-xs text-slate-500">
                All pillars at once · {formatFollowUpQuestions(fullDeepDive.additionalControls)} · ~
                30–45 min
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                showFullLibrary && "rotate-180"
              )}
            />
          </button>

          {showFullLibrary && (
            <div className="border-t border-white/10 px-5 py-4">
              <ul className="space-y-2 text-sm text-slate-400">
                {[
                  "Answers every remaining follow-up question across all pillars",
                  "Best when leadership wants comprehensive coverage in one sitting",
                  "Baseline answers still carry forward per pillar",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {fullDeepDive.childStatus === "completed" && fullDeepDive.childSurveyId ? (
                  <Button asChild size="sm" className="rounded-xl bg-white/10 hover:bg-white/15">
                    <Link href={`/maturity-assessment/${fullDeepDive.childSurveyId}/results`}>
                      View full assessment results
                    </Link>
                  </Button>
                ) : fullDeepDive.childStatus === "in_progress" && fullDeepDive.childSurveyId ? (
                  <Button asChild size="sm" className="rounded-xl bg-white/10 hover:bg-white/15">
                    <Link href={`/maturity-assessment/${fullDeepDive.childSurveyId}`}>
                      Continue full assessment
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading || fullDeepDive.additionalControls === 0}
                    onClick={handleFullLibraryStart}
                    className="rounded-xl bg-white/10 hover:bg-white/15"
                  >
                    {loading && activePillarId === "__full__" ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Preparing…
                      </>
                    ) : (
                      "Start full assessment"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MaturityDeepDiveBaselineBanner({
  report,
}: {
  report: MaturitySurveyReport;
}) {
  if (report.surveyMode !== "deep_dive" || !report.scope.parentQuickScanId) {
    return null;
  }

  const focusLabel =
    report.scope.focusPillarLabels && report.scope.focusPillarLabels.length > 0
      ? report.scope.focusPillarLabels.join(", ")
      : "all pillars";

  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Continues baseline scan
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Pillar focus: {focusLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {report.scope.carriedFromQuickScanCount ?? 0} baseline rating
            {(report.scope.carriedFromQuickScanCount ?? 0) === 1 ? "" : "s"} carried forward.
            Findings reflect the controls you rated — rule-based scoring, not AI-generated.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full">
          <Link href={`/maturity-assessment/${report.scope.parentQuickScanId}/results`}>
            View baseline results
          </Link>
        </Button>
      </div>
    </div>
  );
}
