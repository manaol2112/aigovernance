"use client";

import { ChevronDown, FileCheck, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PillarWorkshopGuide } from "@/lib/pillar-workshop-guide";
import type { DepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import type {
  ConsolidatedWorkshopQuestion,
  SubPillarWorkshopBlock,
} from "@/lib/sub-pillar-workshop-questions";
import type { CriticalEvidenceProbe } from "@/lib/critical-evidence";

type GuideVariant = "default" | "presentation";

type PanelProps = {
  guide: PillarWorkshopGuide | null;
  loading?: boolean;
  activeSubPillarId?: string | null;
  onSubPillarSelect?: (subPillarId: string | null) => void;
  variant?: GuideVariant;
  /** Hide pillar/topic header (presenter view provides its own chrome). */
  hideHeader?: boolean;
};

export function PillarWorkshopGuidePanel({
  guide,
  loading,
  activeSubPillarId,
  onSubPillarSelect,
  variant = "default",
  hideHeader = false,
}: PanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Loading workshop runbook…
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Select a risk pillar to begin the workshop.
      </div>
    );
  }

  if (guide.subPillars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-sm text-amber-700">
        No in-scope requirements mapped to {guide.pillarLabel} yet.
      </div>
    );
  }

  return (
    <div className={variant === "presentation" ? "space-y-6 px-6 pb-8" : "space-y-3 px-4 pb-4"}>
      {!hideHeader && (
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{guide.pillarLabel}</h3>
          <span className="text-[11px] text-slate-400">·</span>
          <span className="text-[11px] text-slate-500">
            {guide.subPillars.length} topic{guide.subPillars.length !== 1 ? "s" : ""}
          </span>
          {guide.coverageComplete && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">
              full coverage
            </Badge>
          )}
        </div>
        {guide.subPillars.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onSubPillarSelect?.(null)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                !activeSubPillarId
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {guide.subPillars.map((block) => (
              <button
                key={block.subPillarId}
                type="button"
                onClick={() => onSubPillarSelect?.(block.subPillarId)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                  activeSubPillarId === block.subPillarId
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {block.subPillarLabel}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {guide.subPillars
        .filter((b) => !activeSubPillarId || b.subPillarId === activeSubPillarId)
        .map((block) => (
          <SubPillarRunbookBlock
            key={block.subPillarId}
            block={block}
            highlighted={activeSubPillarId === block.subPillarId}
            hideEvidenceSection
            variant={variant}
          />
        ))}

      {guide.criticalEvidenceCount > 0 && variant === "default" && (
        <MustHaveEvidenceSection
          title={`Must-have evidence — ${guide.pillarLabel}`}
          probes={guide.criticalEvidenceProbes}
          supportingCount={guide.supportingEvidenceTypeCount}
          defaultOpen={false}
        />
      )}
    </div>
  );
}

export function DepartmentWorkshopGuidePanel({
  guide,
  loading,
  activeSubPillarId,
  onSubPillarSelect,
  variant = "default",
  hideHeader = false,
}: {
  guide: DepartmentWorkshopGuide | null;
  loading?: boolean;
  activeSubPillarId?: string | null;
  onSubPillarSelect?: (subPillarId: string | null) => void;
  variant?: GuideVariant;
  hideHeader?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Loading department runbook…
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Select a department to view targeted facilitation questions across risk pillars.
      </div>
    );
  }

  if (guide.sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-sm text-amber-700">
        No in-scope topics mapped to {guide.departmentLabel} yet. Try organization-wide scope or assign use cases first.
      </div>
    );
  }

  const primarySections = guide.sections.filter((s) => s.relevance === "primary");
  const secondarySections = guide.sections.filter((s) => s.relevance === "secondary");

  return (
    <div className={variant === "presentation" ? "space-y-6 px-6 pb-8" : "space-y-3 px-4 pb-4"}>
      {!hideHeader && (
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{guide.departmentLabel}</h3>
          <span className="text-[11px] text-slate-400">·</span>
          <span className="text-[11px] text-slate-500">{guide.totalQuestions} questions</span>
        </div>
        {guide.sections.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onSubPillarSelect?.(null)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                !activeSubPillarId
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {guide.sections.map(({ block, relevance }) => (
              <button
                key={block.subPillarId}
                type="button"
                onClick={() => onSubPillarSelect?.(block.subPillarId)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                  activeSubPillarId === block.subPillarId
                    ? "bg-indigo-600 text-white"
                    : relevance === "primary"
                      ? "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {block.subPillarLabel}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {primarySections.length > 0 && (
        <div className="space-y-3">
          {primarySections
            .filter(({ block }) => !activeSubPillarId || block.subPillarId === activeSubPillarId)
            .map(({ block }) => (
              <div key={block.subPillarId} className="space-y-2">
                {variant === "default" && (
                  <Badge variant="outline" className="text-[9px] text-slate-500">
                    {block.pillarLabel}
                  </Badge>
                )}
                <SubPillarRunbookBlock
                  block={block}
                  highlighted={activeSubPillarId === block.subPillarId}
                  variant={variant}
                />
              </div>
            ))}
        </div>
      )}

      {secondarySections.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Supporting</p>
          {secondarySections
            .filter(({ block }) => !activeSubPillarId || block.subPillarId === activeSubPillarId)
            .map(({ block }) => (
              <div key={block.subPillarId} className="space-y-2">
                {variant === "default" && (
                  <Badge variant="outline" className="text-[9px] text-slate-500">
                    {block.pillarLabel}
                  </Badge>
                )}
                <SubPillarRunbookBlock
                  block={block}
                  highlighted={activeSubPillarId === block.subPillarId}
                  variant={variant}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function SubPillarWorkshopSection({
  blocks,
  title = "Workshop Questions",
}: {
  blocks: SubPillarWorkshopBlock[];
  title?: string;
}) {
  if (blocks.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <HelpCircle className="h-4 w-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400">No in-scope requirements linked to this control.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <HelpCircle className="h-4 w-4 text-slate-600" />
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      </div>
      <div className="p-4 space-y-4">
        {blocks.map((block) => (
          <SubPillarRunbookBlock key={block.subPillarId} block={block} compact />
        ))}
      </div>
    </section>
  );
}

function SubPillarRunbookBlock({
  block,
  compact,
  highlighted,
  hideEvidenceSection,
  variant = "default",
}: {
  block: SubPillarWorkshopBlock;
  compact?: boolean;
  highlighted?: boolean;
  hideEvidenceSection?: boolean;
  variant?: GuideVariant;
}) {
  const isPresent = variant === "presentation";

  return (
    <div
      id={`sub-pillar-${block.subPillarId}`}
      className={`rounded-xl border overflow-hidden scroll-mt-4 ${
        highlighted ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"
      } bg-white ${isPresent ? "shadow-sm" : ""}`}
    >
      <div className={`border-b border-slate-100 bg-slate-50/80 ${isPresent ? "px-5 py-4" : "px-3 py-2"}`}>
        <p className={isPresent ? "text-lg font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>
          {block.subPillarLabel}
        </p>
        {!compact && block.subPillarDescription && (
          <p className={`mt-1 ${isPresent ? "text-sm text-slate-500" : "line-clamp-1 text-[11px] text-slate-500"}`}>
            {block.subPillarDescription}
          </p>
        )}
        <p className={`mt-1 ${isPresent ? "text-xs text-slate-400" : "text-[10px] text-slate-400"}`}>
          {block.questionCount} question{block.questionCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {block.questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={i}
            isSupplement={i >= block.questionCount - block.supplementCount && block.supplementCount > 0}
            variant={variant}
          />
        ))}
      </div>

      {!hideEvidenceSection && block.criticalEvidenceCount > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/30">
          <MustHaveEvidenceSection
            title="Must-have evidence"
            probes={block.criticalEvidenceProbes}
            supportingCount={block.supportingEvidenceTypeCount}
            compact
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  index,
  isSupplement,
  variant = "default",
}: {
  question: ConsolidatedWorkshopQuestion;
  index: number;
  isSupplement?: boolean;
  variant?: GuideVariant;
}) {
  const isPresent = variant === "presentation";
  const phaseColors: Record<string, string> = {
    context: "bg-slate-100 text-slate-600",
    design: "bg-violet-100 text-violet-700",
    implementation: "bg-blue-100 text-blue-700",
    effectiveness: "bg-emerald-100 text-emerald-700",
    gaps: "bg-amber-100 text-amber-700",
    application: "bg-indigo-100 text-indigo-700",
  };

  return (
    <div className={isPresent ? "px-5 py-5" : "px-3 py-3 hover:bg-slate-50/50 transition-colors"}>
      <div className={`flex items-start ${isPresent ? "gap-4" : "gap-3"}`}>
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white ${
            isPresent ? "h-10 w-10 text-base" : "h-7 w-7 text-xs"
          }`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={`font-semibold uppercase tracking-wide ${phaseColors[question.phase] ?? ""} ${
                isPresent ? "text-[10px]" : "text-[9px]"
              }`}
            >
              {question.phaseLabel}
            </Badge>
            {isSupplement && (
              <Badge variant="outline" className={`text-amber-700 border-amber-200 ${isPresent ? "text-[10px]" : "text-[9px]"}`}>
                supplemental
              </Badge>
            )}
          </div>
          <p className={`font-medium leading-relaxed text-slate-900 ${isPresent ? "text-lg" : "text-sm"}`}>
            {question.prompt}
          </p>
          <p className={`mt-2 italic text-slate-500 ${isPresent ? "text-sm" : "mt-1.5 text-xs text-slate-400"}`}>
            {question.intent}
          </p>
          {question.probes.length > 0 && (
            <details className={`mt-3 rounded-lg border border-slate-100 bg-slate-50/80 ${isPresent ? "" : "mt-2.5"}`}>
              <summary
                className={`cursor-pointer px-3 py-2 font-medium text-indigo-600 hover:text-indigo-800 ${
                  isPresent ? "text-sm" : "text-[11px]"
                }`}
              >
                Follow-up probes ({question.probes.length})
              </summary>
              <ul className="border-t border-slate-100 px-3 py-2 space-y-2">
                {question.probes.map((probe) => (
                  <li
                    key={probe}
                    className={`leading-relaxed text-slate-600 before:mr-1.5 before:font-bold before:text-indigo-400 before:content-['→'] ${
                      isPresent ? "text-sm" : "text-[11px]"
                    }`}
                  >
                    {probe}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function MustHaveEvidenceSection({
  title,
  probes,
  supportingCount,
  compact,
  defaultOpen = false,
}: {
  title: string;
  probes: CriticalEvidenceProbe[];
  supportingCount?: number;
  compact?: boolean;
  /** When false (default), the checklist is collapsed so facilitation questions stay in focus. */
  defaultOpen?: boolean;
}) {
  if (probes.length === 0) return null;

  return (
    <details
      open={defaultOpen}
      className={`group rounded-xl border border-amber-200/80 bg-amber-50/40 ${compact ? "" : "shadow-sm"}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <FileCheck className="h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-950">{title}</p>
          <p className="text-[11px] text-amber-800/70">
            {probes.length} item{probes.length !== 1 ? "s" : ""} — expand when you need the evidence checklist
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 border-amber-300 bg-white/80 text-[9px] text-amber-900">
          optional
        </Badge>
        <ChevronDown className="h-4 w-4 shrink-0 text-amber-700 transition-transform group-open:rotate-180" />
      </summary>

      <div className={`border-t border-amber-200/60 ${compact ? "px-3 pb-3 pt-2" : "px-4 pb-4 pt-3"}`}>
        <p className="text-[11px] leading-relaxed text-amber-800/80">
          Confirm whether these artifacts exist before closing the workshop. Ask where each is stored, who owns it, and when it was last updated.
        </p>
        <ol className={`mt-3 space-y-2.5 ${compact ? "" : "sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0"}`}>
          {probes.map((ev, i) => (
            <li
              key={`${ev.evidenceType}-${ev.description}`}
              className="rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2.5"
            >
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-950">{ev.evidenceType}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90">{ev.probe}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-amber-700/70">{ev.rationale}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {supportingCount != null && supportingCount > 0 && (
          <p className="mt-3 text-[10px] text-amber-700/60">
            +{supportingCount} additional supporting evidence type{supportingCount !== 1 ? "s" : ""} may be collected during control analysis.
          </p>
        )}
      </div>
    </details>
  );
}
