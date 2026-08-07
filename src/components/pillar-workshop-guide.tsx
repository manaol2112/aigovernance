"use client";

import type { ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  FileCheck,
  HelpCircle,
  Layers3,
  Loader2,
  MessageSquareQuote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PillarWorkshopGuide } from "@/lib/pillar-workshop-guide";
import type { DepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import type {
  ConsolidatedWorkshopQuestion,
  SubPillarWorkshopBlock,
} from "@/lib/sub-pillar-workshop-questions";
import type { CriticalEvidenceProbe } from "@/lib/critical-evidence";
import { cn } from "@/lib/utils";

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

function GuideStateCard({
  tone = "slate",
  icon: Icon,
  title,
  description,
  loading,
}: {
  tone?: "slate" | "amber";
  icon: typeof BookOpen;
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border px-8 py-14 text-center",
        tone === "amber"
          ? "border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white"
          : "border-dashed border-slate-300 bg-white shadow-sm"
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-indigo-50 text-indigo-600"
        )}
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
      </span>
      <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function TopicChip({
  label,
  selected,
  onClick,
  emphasis,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  emphasis?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        selected
          ? "border-indigo-200 bg-indigo-600 text-white shadow-sm"
          : emphasis === "primary"
            ? "border-indigo-100 bg-white text-indigo-800 hover:border-indigo-200 hover:bg-indigo-50/60"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function GuideStickyHeader({
  title,
  meta,
  badge,
  topics,
  activeSubPillarId,
  onSubPillarSelect,
  variant,
}: {
  title: string;
  meta: string;
  badge?: ReactNode;
  topics: Array<{ id: string; label: string; relevance?: "primary" | "secondary" }>;
  activeSubPillarId?: string | null;
  onSubPillarSelect?: (subPillarId: string | null) => void;
  variant: GuideVariant;
}) {
  if (variant === "presentation") return null;

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">Runbook</p>
        <span className="text-slate-300">·</span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-[11px] text-slate-400">·</span>
        <span className="text-[11px] text-slate-500">{meta}</span>
        {badge}
      </div>
      {topics.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <TopicChip label="All topics" selected={!activeSubPillarId} onClick={() => onSubPillarSelect?.(null)} />
          {topics.map((topic) => (
            <TopicChip
              key={topic.id}
              label={topic.label}
              selected={activeSubPillarId === topic.id}
              emphasis={topic.relevance}
              onClick={() => onSubPillarSelect?.(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PillarWorkshopGuidePanel({
  guide,
  loading,
  activeSubPillarId,
  onSubPillarSelect,
  variant = "default",
  hideHeader = false,
}: PanelProps) {
  const isPresent = variant === "presentation";

  if (loading) {
    return (
      <div className={isPresent ? "p-6" : "flex min-h-[320px] items-center justify-center p-6"}>
        <GuideStateCard
          loading
          icon={BookOpen}
          title="Loading facilitation runbook"
          description="Preparing workshop questions for the selected scope…"
        />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className={isPresent ? "p-6" : "flex min-h-[320px] items-center justify-center p-6"}>
        <GuideStateCard
          icon={Layers3}
          title="Select a risk pillar"
          description="Choose a pillar from the sidebar to open its facilitation runbook and begin the session."
        />
      </div>
    );
  }

  if (guide.subPillars.length === 0) {
    return (
      <div className={isPresent ? "p-6" : "flex min-h-[320px] items-center justify-center p-6"}>
        <GuideStateCard
          tone="amber"
          icon={HelpCircle}
          title="No topics in scope"
          description={`No in-scope requirements are mapped to ${guide.pillarLabel} yet. Review requirement scoping or adjust use case scope.`}
        />
      </div>
    );
  }

  const totalQuestions = guide.subPillars.reduce((sum, b) => sum + b.questionCount, 0);

  return (
    <div className={isPresent ? "space-y-6 px-6 pb-8" : "flex min-h-0 flex-col"}>
      {!hideHeader && (
        <GuideStickyHeader
          variant={variant}
          title={guide.pillarLabel}
          meta={`${guide.subPillars.length} topic${guide.subPillars.length !== 1 ? "s" : ""} · ${totalQuestions} questions`}
          badge={
            guide.coverageComplete ? (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">
                full coverage
              </Badge>
            ) : undefined
          }
          topics={guide.subPillars.map((b) => ({ id: b.subPillarId, label: b.subPillarLabel }))}
          activeSubPillarId={activeSubPillarId}
          onSubPillarSelect={onSubPillarSelect}
        />
      )}

      <div className={isPresent ? "space-y-6" : "space-y-4 px-5 py-5 pb-8"}>
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
  const isPresent = variant === "presentation";

  if (loading) {
    return (
      <div className={isPresent ? "p-6" : "flex min-h-[320px] items-center justify-center p-6"}>
        <GuideStateCard
          loading
          icon={BookOpen}
          title="Loading department runbook"
          description="Building targeted facilitation questions across risk pillars…"
        />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className={isPresent ? "p-6" : "flex min-h-[320px] items-center justify-center p-6"}>
        <GuideStateCard
          icon={Layers3}
          title="Select a stakeholder group"
          description="Choose a department to view targeted facilitation questions organized by risk pillar."
        />
      </div>
    );
  }

  if (guide.sections.length === 0) {
    return (
      <div className={isPresent ? "p-6" : "flex min-h-[320px] items-center justify-center p-6"}>
        <GuideStateCard
          tone="amber"
          icon={HelpCircle}
          title="No topics mapped"
          description={`No in-scope topics are mapped to ${guide.departmentLabel} yet. Try organization-wide scope or assign use cases first.`}
        />
      </div>
    );
  }

  const primarySections = guide.sections.filter((s) => s.relevance === "primary");
  const secondarySections = guide.sections.filter((s) => s.relevance === "secondary");

  return (
    <div className={isPresent ? "space-y-6 px-6 pb-8" : "flex min-h-0 flex-col"}>
      {!hideHeader && (
        <GuideStickyHeader
          variant={variant}
          title={guide.departmentLabel}
          meta={`${guide.totalQuestions} facilitation questions`}
          topics={guide.sections.map(({ block, relevance }) => ({
            id: block.subPillarId,
            label: block.subPillarLabel,
            relevance: relevance === "primary" ? "primary" : "secondary",
          }))}
          activeSubPillarId={activeSubPillarId}
          onSubPillarSelect={onSubPillarSelect}
        />
      )}

      <div className={isPresent ? "space-y-6" : "space-y-5 px-5 py-5 pb-8"}>
        {primarySections.length > 0 && (
          <div className="space-y-4">
            {variant === "default" && secondarySections.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                Primary topics
              </p>
            )}
            {primarySections
              .filter(({ block }) => !activeSubPillarId || block.subPillarId === activeSubPillarId)
              .map(({ block }) => (
                <div key={block.subPillarId} className="space-y-2">
                  {variant === "default" && (
                    <Badge variant="outline" className="border-indigo-100 bg-indigo-50/50 text-[9px] text-indigo-700">
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
          <div className="space-y-4">
            {variant === "default" && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Supporting topics
              </p>
            )}
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
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
          <HelpCircle className="h-4 w-4 text-indigo-600" />
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-500">No in-scope requirements linked to this control.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
        <HelpCircle className="h-4 w-4 text-indigo-600" />
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <div className="space-y-4 p-4">
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
    <article
      id={`sub-pillar-${block.subPillarId}`}
      className={cn(
        "scroll-mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm",
        highlighted ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200/80",
        isPresent && "shadow-md"
      )}
    >
      <div
        className={cn(
          "border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white",
          isPresent ? "px-6 py-5" : compact ? "px-4 py-3" : "px-5 py-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "font-semibold text-slate-900",
                isPresent ? "text-lg" : compact ? "text-sm" : "text-base"
              )}
            >
              {block.subPillarLabel}
            </p>
            {!compact && block.subPillarDescription && (
              <p
                className={cn(
                  "mt-1 leading-relaxed text-slate-500",
                  isPresent ? "text-sm" : "line-clamp-2 text-xs"
                )}
              >
                {block.subPillarDescription}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
            {block.questionCount} Q
          </span>
        </div>
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
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
          <MustHaveEvidenceSection
            title="Must-have evidence"
            probes={block.criticalEvidenceProbes}
            supportingCount={block.supportingEvidenceTypeCount}
            compact
            defaultOpen={false}
          />
        </div>
      )}
    </article>
  );
}

const PHASE_STYLES: Record<string, string> = {
  context: "border-slate-200 bg-slate-50 text-slate-700",
  design: "border-violet-200 bg-violet-50 text-violet-800",
  implementation: "border-blue-200 bg-blue-50 text-blue-800",
  effectiveness: "border-emerald-200 bg-emerald-50 text-emerald-800",
  gaps: "border-amber-200 bg-amber-50 text-amber-800",
  application: "border-indigo-200 bg-indigo-50 text-indigo-800",
};

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

  return (
    <div
      className={cn(
        "transition-colors",
        isPresent ? "px-6 py-6" : "px-5 py-4 hover:bg-slate-50/40"
      )}
    >
      <div className={cn("flex items-start", isPresent ? "gap-5" : "gap-4")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm",
            isPresent ? "h-11 w-11 text-base" : "h-9 w-9 text-sm"
          )}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                PHASE_STYLES[question.phase] ?? PHASE_STYLES.context
              )}
            >
              {question.phaseLabel}
            </span>
            {isSupplement && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[9px] text-amber-800">
                supplemental
              </Badge>
            )}
          </div>
          <p
            className={cn(
              "font-medium leading-relaxed text-slate-900",
              isPresent ? "text-lg" : "text-sm"
            )}
          >
            {question.prompt}
          </p>
          <p
            className={cn(
              "mt-2 flex items-start gap-2 italic leading-relaxed text-slate-500",
              isPresent ? "text-sm" : "text-xs"
            )}
          >
            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span>{question.intent}</span>
          </p>
          {question.probes.length > 0 && (
            <details className="group mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/60">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-xs font-semibold text-indigo-700 marker:content-none hover:bg-indigo-50/40 [&::-webkit-details-marker]:hidden">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                Follow-up probes ({question.probes.length})
              </summary>
              <ul className="space-y-2 border-t border-slate-100 px-4 py-3">
                {question.probes.map((probe) => (
                  <li
                    key={probe}
                    className={cn(
                      "leading-relaxed text-slate-600 before:mr-2 before:font-bold before:text-indigo-400 before:content-['→']",
                      isPresent ? "text-sm" : "text-xs"
                    )}
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
  defaultOpen?: boolean;
}) {
  if (probes.length === 0) return null;

  return (
    <details
      open={defaultOpen}
      className={cn(
        "group overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 to-white",
        !compact && "shadow-sm"
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
          <FileCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">{title}</p>
          <p className="text-[11px] text-amber-800/70">
            {probes.length} item{probes.length !== 1 ? "s" : ""} — expand when you need the evidence checklist
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 border-amber-300 bg-white/80 text-[9px] text-amber-900">
          optional
        </Badge>
        <ChevronDown className="h-4 w-4 shrink-0 text-amber-700 transition-transform group-open:rotate-180" />
      </summary>

      <div className={cn("border-t border-amber-200/60", compact ? "px-4 pb-4 pt-3" : "px-5 pb-5 pt-4")}>
        <p className="text-[11px] leading-relaxed text-amber-800/80">
          Confirm whether these artifacts exist before closing the workshop. Ask where each is stored, who owns it,
          and when it was last updated.
        </p>
        <ol className={cn("mt-3 space-y-2.5", compact ? "" : "sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0")}>
          {probes.map((ev, i) => (
            <li
              key={`${ev.evidenceType}-${ev.description}`}
              className="rounded-xl border border-amber-200/80 bg-white/90 px-3.5 py-3 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
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
            +{supportingCount} additional supporting evidence type{supportingCount !== 1 ? "s" : ""} may be collected
            during control analysis.
          </p>
        )}
      </div>
    </details>
  );
}
