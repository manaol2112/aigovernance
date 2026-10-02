"use client";

import { PillarAnswerPicker } from "@/components/pillar-answer-picker";
import { MaturityPackPillarSectionHeader } from "@/components/maturity-pack-pillar-section-header";
import { cn } from "@/lib/utils";
import type { PackAnswerRecord, PackSnapshot, PillarQuestionAnswer } from "@/lib/pillar-questionnaire";
import type { PackPillarGroup } from "@/components/maturity-pack-question-chrome";

type Props = {
  organizationName?: string | null;
  title: string;
  modeLabel: string;
  snapshots: PackSnapshot[];
  pillarGroups: PackPillarGroup[];
  answersById: Map<string, PackAnswerRecord>;
  stepIndex: number;
  progressPct: number;
  answeredCount: number;
  allComplete: boolean;
  saving: boolean;
  notesOpenId: string | null;
  notesPlaceholder: string;
  onSelectStep: (index: number) => void;
  onAnswer: (questionId: string, answer: PillarQuestionAnswer, notes?: string) => void;
  onOpenNotes: (questionId: string) => void;
};

export function MaturityPackListView({
  organizationName,
  title,
  modeLabel,
  snapshots,
  pillarGroups,
  answersById,
  stepIndex,
  progressPct,
  answeredCount,
  allComplete,
  saving,
  notesOpenId,
  notesPlaceholder,
  onSelectStep,
  onAnswer,
  onOpenNotes,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.28)]">
      <header className="brand-ink-surface relative bg-black px-6 py-6 text-white sm:px-8 sm:py-7">
        <span
          aria-hidden
          className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-[var(--theme-brand)]"
        />
        <div className="flex flex-wrap items-end justify-between gap-4 pl-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
              {modeLabel}
            </p>
            <h1 className="mt-2 truncate text-xl font-light tracking-tight sm:text-2xl">
              {organizationName?.trim() || title}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-light tabular-nums tracking-tight">{progressPct}%</p>
            <p className="mt-0.5 text-xs tabular-nums text-slate-400">
              {answeredCount} of {snapshots.length} complete
            </p>
          </div>
        </div>
        <div className="mt-5 h-0.5 overflow-hidden bg-white/15">
          <div
            className="h-full bg-[var(--theme-brand)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allComplete && (
          <p className="mt-3 text-xs font-medium text-slate-300">
            Complete — proceed to review when ready
          </p>
        )}
      </header>

      <div>
        {pillarGroups.map((group, groupIndex) => {
          return (
            <section key={group.pillarId} className="border-t border-slate-200 first:border-t-0">
              <MaturityPackPillarSectionHeader
                index={groupIndex}
                totalAreas={pillarGroups.length}
                pillarId={group.pillarId}
                pillarLabel={group.pillarLabel}
                answeredCount={group.answeredCount}
                totalCount={group.totalCount}
              />

              <ul className="divide-y divide-slate-100">
                {group.questionIndices.map((index) => {
                  const snapshot = snapshots[index];
                  if (!snapshot) return null;
                  const displayNumber = index + 1;
                  const record = answersById.get(snapshot.id) ?? null;
                  const answered = Boolean(record);
                  const notesExpanded =
                    notesOpenId === snapshot.id || Boolean(record?.notes?.trim());
                  const active = index === stepIndex;

                  return (
                    <li
                      key={snapshot.id}
                      id={`pack-q-${snapshot.id}`}
                      className={cn(
                        "relative transition-colors",
                        active && "bg-[var(--theme-brand-muted)]/20"
                      )}
                    >
                      {answered && (
                        <span
                          aria-hidden
                          className="absolute bottom-3 left-0 top-3 w-0.5 bg-[var(--theme-brand)]"
                        />
                      )}

                      <div className="grid gap-4 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] sm:items-start sm:gap-10 sm:px-8 sm:py-6">
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => onSelectStep(index)}
                          >
                            <div className="flex gap-3.5">
                              <span
                                className={cn(
                                  "mt-0.5 w-8 shrink-0 text-[11px] font-semibold tabular-nums",
                                  answered ? "text-slate-700" : "text-slate-400"
                                )}
                                aria-label={answered ? `Question ${displayNumber}, answered` : undefined}
                              >
                                {String(displayNumber).padStart(2, "0")}
                              </span>
                              <span className="text-[15px] font-medium leading-snug tracking-tight text-slate-900">
                                {snapshot.prompt}
                              </span>
                            </div>
                          </button>

                          {record && (
                            <div className="mt-2.5 pl-[3.25rem]">
                              {!notesExpanded ? (
                                <button
                                  type="button"
                                  className="text-xs text-slate-400 underline decoration-slate-200 underline-offset-2 transition-colors hover:text-slate-700 hover:decoration-slate-400"
                                  onClick={() => onOpenNotes(snapshot.id)}
                                >
                                  Add note
                                </button>
                              ) : (
                                <textarea
                                  key={snapshot.id}
                                  defaultValue={record.notes ?? ""}
                                  onBlur={(event) => {
                                    onAnswer(snapshot.id, record.answer, event.target.value);
                                  }}
                                  rows={2}
                                  placeholder={notesPlaceholder}
                                  aria-label={`Note for question ${displayNumber}`}
                                  className="w-full max-w-lg resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/8"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <PillarAnswerPicker
                            variant="compact"
                            name={snapshot.prompt}
                            value={record?.answer ?? null}
                            disabled={saving}
                            onChange={(answer) => {
                              onSelectStep(index);
                              onAnswer(snapshot.id, answer, record?.notes ?? "");
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
