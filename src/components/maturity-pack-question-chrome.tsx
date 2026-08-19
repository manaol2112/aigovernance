"use client";

import { cn } from "@/lib/utils";
import type { PackAnswerRecord, PackSnapshot } from "@/lib/pillar-questionnaire";
import { getPackClientCopy, type PackClientCopy } from "@/lib/maturity-client-copy";
import { RISK_PILLARS } from "@/lib/risk-pillars";

export type PackPillarGroup = {
  pillarId: string;
  pillarLabel: string;
  questionIndices: number[];
  answeredCount: number;
  totalCount: number;
};

export function buildPackPillarGroups(
  snapshots: PackSnapshot[],
  answersById: Map<string, PackAnswerRecord>
): PackPillarGroup[] {
  const groups = new Map<string, PackPillarGroup>();

  snapshots.forEach((snapshot, index) => {
    const existing = groups.get(snapshot.pillarId);
    const answered = answersById.has(snapshot.id);
    if (existing) {
      existing.questionIndices.push(index);
      existing.totalCount += 1;
      if (answered) existing.answeredCount += 1;
      return;
    }
    groups.set(snapshot.pillarId, {
      pillarId: snapshot.pillarId,
      pillarLabel: snapshot.pillarLabel,
      questionIndices: [index],
      answeredCount: answered ? 1 : 0,
      totalCount: 1,
    });
  });

  return Array.from(groups.values());
}

type Props = {
  product?: "maturity" | "workshop";
  snapshots: PackSnapshot[];
  stepIndex: number;
  progressPct: number;
  answeredCount: number;
  answersById: Map<string, PackAnswerRecord>;
  organizationName?: string | null;
  onGoToStep: (index: number) => void;
};

export function MaturityPackQuestionChrome({
  product = "maturity",
  snapshots,
  stepIndex,
  progressPct,
  answeredCount,
  answersById,
  organizationName,
  onGoToStep,
}: Props) {
  const copy: PackClientCopy = getPackClientCopy(product);
  const isWorkshop = product === "workshop";
  const current = snapshots[stepIndex];
  if (!current) return null;

  const pillarGroups = buildPackPillarGroups(snapshots, answersById);
  const currentGroupIndex = pillarGroups.findIndex((group) => group.pillarId === current.pillarId);
  const currentGroup = pillarGroups[currentGroupIndex];
  const questionInPillar =
    currentGroup?.questionIndices.findIndex((index) => index === stepIndex) ?? 0;
  const pillarMeta = RISK_PILLARS.find((pillar) => pillar.id === current.pillarId);

  return (
    <div
      className={cn(
        "border-b border-slate-100/80 px-6 py-6 text-white sm:px-8 sm:py-7",
        isWorkshop
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950"
          : "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.22em]",
              isWorkshop ? "text-emerald-300" : "text-indigo-300"
            )}
          >
            {copy.modeLabel}
          </p>
          <p className="mt-1 truncate text-sm text-slate-400">
            {organizationName?.trim() || (isWorkshop ? "Client organization" : "Your organization")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Progress
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{progressPct}%</p>
          <p className="text-[11px] tabular-nums text-slate-500">
            {answeredCount} of {snapshots.length} answered
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-1" role="navigation" aria-label="Assessment areas">
        {pillarGroups.map((group, index) => {
          const complete = group.answeredCount === group.totalCount;
          const active = group.pillarId === current.pillarId;
          const started = group.answeredCount > 0;
          const firstIndex = group.questionIndices[0] ?? 0;
          const fill =
            group.totalCount > 0 ? Math.round((group.answeredCount / group.totalCount) * 100) : 0;

          return (
            <button
              key={group.pillarId}
              type="button"
              title={`${group.pillarLabel} · ${group.answeredCount} of ${group.totalCount} answered`}
              aria-current={active ? "step" : undefined}
              aria-label={`${group.pillarLabel}, ${group.answeredCount} of ${group.totalCount} answered`}
              onClick={() => onGoToStep(firstIndex)}
              className={cn(
                "group relative h-2 min-w-0 flex-1 overflow-hidden rounded-full transition-all",
                active ? "h-2.5 ring-2 ring-white/40 ring-offset-2 ring-offset-slate-900" : "hover:h-2.5"
              )}
            >
              <span className="absolute inset-0 bg-white/15" />
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                  complete ? "bg-emerald-400" : started ? (isWorkshop ? "bg-emerald-400" : "bg-indigo-400") : "bg-transparent"
                )}
                style={{ width: `${fill}%` }}
              />
              <span className="sr-only">
                Area {index + 1}: {group.pillarLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            isWorkshop ? "text-emerald-300/90" : "text-indigo-300/90"
          )}
        >
          Area {currentGroupIndex + 1} of {pillarGroups.length}
        </p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
          {current.pillarLabel}
        </h2>
        {pillarMeta?.description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            {pillarMeta.description}
          </p>
        )}

        {currentGroup && currentGroup.totalCount > 1 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex gap-1.5">
              {currentGroup.questionIndices.map((index, pip) => {
                const answered = answersById.has(snapshots[index]?.id ?? "");
                const active = index === stepIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    title={`Question ${pip + 1} of ${currentGroup.totalCount}`}
                    onClick={() => onGoToStep(index)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      active && "w-6 bg-white",
                      !active && answered && "bg-emerald-400",
                      !active && !answered && "bg-white/25 hover:bg-white/50"
                    )}
                    aria-label={`Question ${pip + 1} of ${currentGroup.totalCount} in this area`}
                    aria-current={active ? "true" : undefined}
                  />
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              Question {questionInPillar + 1} of {currentGroup.totalCount} in this area
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const SURVEY_QUESTION_CARD =
  "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02] sm:p-8";
