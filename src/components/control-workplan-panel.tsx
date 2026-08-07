"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  Filter,
  HelpCircle,
  ListChecks,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubPillarWorkshopSection } from "@/components/pillar-workshop-guide";
import type { ControlWorkplan } from "@/lib/control-workplan";
import {
  filterWorkplanByFrameworks,
  getWorkplanFrameworkOptions,
  parseFrameworkFilterParam,
  serializeFrameworkFilterParam,
  type FilteredControlWorkplanView,
} from "@/lib/control-workplan-filter";
import type {
  AssessmentProcedureStep,
  RequirementAssessmentWorkProgram,
} from "@/lib/control-assessment-procedure";
import { titleCase } from "@/lib/utils";
import { cn } from "@/lib/utils";

type WorkplanTab = "procedure" | "evidence" | "workshop";

type Props = {
  workplan: ControlWorkplan;
};

const TAB_META: Array<{ id: WorkplanTab; label: string; icon: typeof ListChecks }> = [
  { id: "procedure", label: "Test procedures", icon: ListChecks },
  { id: "evidence", label: "Evidence required", icon: FileCheck },
  { id: "workshop", label: "Workshop questions", icon: HelpCircle },
];

const SECTION_STYLES = {
  planning: "border-slate-200 bg-slate-50/70",
  requirement_test: "border-indigo-200 bg-indigo-50/30",
  conclusion: "border-emerald-200 bg-emerald-50/40",
} as const;

export function ControlWorkplanPanel({ workplan }: Props) {
  const [activeTab, setActiveTab] = useState<WorkplanTab>("procedure");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const availableFrameworks = useMemo(
    () => getWorkplanFrameworkOptions(workplan),
    [workplan]
  );

  const allFrameworkCodes = useMemo(
    () => availableFrameworks.map((option) => option.code),
    [availableFrameworks]
  );

  const frameworksParam = searchParams.get("frameworks");

  const selectedFrameworks = useMemo(() => {
    const fromUrl = parseFrameworkFilterParam(frameworksParam);
    const valid = fromUrl.filter((code) => allFrameworkCodes.includes(code));
    return valid.length > 0 ? valid : allFrameworkCodes;
  }, [frameworksParam, allFrameworkCodes]);

  const filteredWorkplan = useMemo(
    () => filterWorkplanByFrameworks(workplan, selectedFrameworks),
    [workplan, selectedFrameworks]
  );

  function updateFrameworkSelection(next: string[]) {
    const normalized =
      next.length > 0
        ? next.filter((code) => allFrameworkCodes.includes(code))
        : allFrameworkCodes;

    const params = new URLSearchParams(searchParams.toString());
    if (normalized.length === allFrameworkCodes.length) {
      params.delete("frameworks");
    } else {
      params.set("frameworks", serializeFrameworkFilterParam(normalized));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggleFramework(code: string) {
    const isSelected = selectedFrameworks.includes(code);
    if (isSelected && selectedFrameworks.length === 1) return;
    const next = isSelected
      ? selectedFrameworks.filter((item) => item !== code)
      : [...selectedFrameworks, code];
    updateFrameworkSelection(next);
  }

  const readiness = useMemo(() => {
    const checks = [
      filteredWorkplan.stats.assessmentStepCount > 0,
      filteredWorkplan.stats.evidenceCount > 0,
      filteredWorkplan.stats.questionCount > 0,
      filteredWorkplan.stats.requirementCount > 0,
    ];
    const complete = checks.filter(Boolean).length;
    return {
      complete,
      total: checks.length,
      ready: complete === checks.length,
    };
  }, [filteredWorkplan.stats]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl shadow-slate-300/30">
        <div className="border-b border-white/10 px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200/80">
                Enterprise control workplan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight lg:text-3xl">
                {workplan.control.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{workplan.control.description}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Workplan readiness
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {readiness.complete}/{readiness.total}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {readiness.ready ? "Ready for assessment execution" : "Some workplan elements are still missing"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Framework requirements" value={filteredWorkplan.stats.requirementCount} />
            <MetricCard label="Assessment steps" value={filteredWorkplan.stats.assessmentStepCount} />
            <MetricCard label="Evidence artifacts" value={filteredWorkplan.stats.evidenceCount} />
            <MetricCard label="Workshop questions" value={filteredWorkplan.stats.questionCount} />
          </div>
          {filteredWorkplan.isFiltered && (
            <p className="mt-4 text-xs text-indigo-200/90">
              Filtered view — showing {filteredWorkplan.selectedFrameworks.length} of{" "}
              {availableFrameworks.length} linked framework
              {availableFrameworks.length === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border-t border-white/10 px-6 py-5 lg:border-r lg:px-8">
            <div className="flex flex-wrap gap-2">
              <MetaChip label="Owner" value={workplan.control.ownerRole} />
              <MetaChip label="Type" value={titleCase(workplan.control.controlType)} />
              <MetaChip label="Frequency" value={titleCase(workplan.control.frequency)} />
              <MetaChip label="Status" value={titleCase(workplan.control.verificationStatus)} />
            </div>
            {workplan.control.cosoIcfComponent && (
              <p className="mt-4 text-xs leading-relaxed text-slate-300">
                <Shield className="mr-1.5 inline h-3.5 w-3.5 text-indigo-300" />
                {workplan.control.cosoIcfComponent}
                {workplan.control.cosoIcfPrinciple ? ` — ${workplan.control.cosoIcfPrinciple}` : ""}
              </p>
            )}
          </div>

          <div className="border-t border-white/10 px-6 py-5 lg:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Assessment execution model
            </p>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              <li>1. Run workshop questions to establish operating reality.</li>
              <li>2. Request and validate required evidence artifacts.</li>
              <li>3. Execute test procedures and document gaps or in-place practices.</li>
            </ol>
          </div>
        </div>
      </section>

      {availableFrameworks.length > 1 && (
        <FrameworkFilterBar
          options={availableFrameworks}
          selectedFrameworks={selectedFrameworks}
          isFiltered={filteredWorkplan.isFiltered}
          onToggleFramework={toggleFramework}
          onSelectAll={() => updateFrameworkSelection(allFrameworkCodes)}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex flex-wrap gap-1">
              {TAB_META.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "procedure" && <TestProceduresSection workplan={filteredWorkplan} />}
          {activeTab === "evidence" && <EvidenceSection workplan={filteredWorkplan} />}
          {activeTab === "workshop" && <WorkshopSection workplan={filteredWorkplan} />}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <FrameworkRequirementsCard workplan={filteredWorkplan} />
          <WorkplanChecklistCard workplan={filteredWorkplan} />
        </aside>
      </div>
    </div>
  );
}

function FrameworkFilterBar({
  options,
  selectedFrameworks,
  isFiltered,
  onToggleFramework,
  onSelectAll,
}: {
  options: ReturnType<typeof getWorkplanFrameworkOptions>;
  selectedFrameworks: string[];
  isFiltered: boolean;
  onToggleFramework: (code: string) => void;
  onSelectAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold text-slate-900">Framework view</p>
            {isFiltered && (
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
                Custom
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Show the workplan for one framework or any combination — test procedures, evidence, and
            workshop questions update together.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onSelectAll}>
          All frameworks
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedFrameworks.includes(option.code);
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => onToggleFramework(option.code)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-all",
                active
                  ? "border-indigo-300 bg-indigo-50 shadow-sm ring-2 ring-indigo-100"
                  : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
              )}
            >
              <p className="text-sm font-semibold text-slate-900">{option.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {option.requirementCount} requirement{option.requirementCount === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}

function TestProceduresSection({ workplan }: { workplan: FilteredControlWorkplanView }) {
  const program = workplan.assessmentTestProgram;

  if (program.requirementPrograms.length === 0) {
    return (
      <EmptySection
        icon={ListChecks}
        title="No requirements in this framework view"
        description="Select one or more frameworks above to generate the matching assessment test program."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Assessment objective
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{program.assessmentObjective}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{program.scopeStatement}</p>
        <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs leading-relaxed text-indigo-900">
          Every step below is derived from linked framework requirement text and mapped evidence —
          not generated independently. Workshop claims must be validated against documentary evidence.
        </p>
      </section>

      <AssessmentStepGroup
        title="Phase 1 — Planning and scoping"
        subtitle="Establish scope, walkthrough understanding, and evidence plan before testing requirements."
        steps={program.preparatorySteps}
      />

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Phase 2 — Requirement-based testing
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Execute one work program per linked framework clause ({program.requirementPrograms.length}).
          </p>
        </div>

        {program.requirementPrograms.map((requirementProgram, index) => (
          <RequirementWorkProgramCard
            key={requirementProgram.requirementId}
            program={requirementProgram}
            index={index + 1}
          />
        ))}
      </div>

      <AssessmentStepGroup
        title="Phase 3 — Conclusion and workpaper documentation"
        subtitle="Reconcile evidence, document gaps, and finalize the control conclusion."
        steps={program.concludingSteps}
      />
    </div>
  );
}

function AssessmentStepGroup({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: AssessmentProcedureStep[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="space-y-3 p-5">
        {steps.map((step) => (
          <AssessmentStepCard key={step.stepNumber} step={step} />
        ))}
      </div>
    </section>
  );
}

function RequirementWorkProgramCard({
  program,
  index,
}: {
  program: RequirementAssessmentWorkProgram;
  index: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Requirement work program {index}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{program.frameworkCode}</Badge>
              <code className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-800">
                {program.clauseId}
              </code>
              <Badge variant="outline">{program.coverage} coverage</Badge>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{program.title}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{program.sourceDocument}</p>
            {program.sourcePage && <p className="mt-1">{program.sourcePage}</p>}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{program.objective}</p>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Framework obligation (verbatim)
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">{program.requirementText}</p>
        </div>

        {program.obligationElements.length > 1 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-800">
              Testable obligation elements
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
              {program.obligationElements.map((element) => (
                <li key={element}>{element}</li>
              ))}
            </ol>
          </div>
        )}

        {program.evidenceExpectations.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Evidence to obtain for this clause
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-slate-700">
              {program.evidenceExpectations.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {program.steps.map((step) => (
            <AssessmentStepCard key={step.stepNumber} step={step} />
          ))}
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Conclusion criteria
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-slate-700">
            {program.conclusionCriteria.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AssessmentStepCard({ step }: { step: AssessmentProcedureStep }) {
  return (
    <div className={cn("rounded-xl border p-4", SECTION_STYLES[step.phase])}>
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
          {step.stepNumber}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm leading-relaxed text-slate-800">{step.action}</p>

          {step.frameworkBasis && (
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Framework basis
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.frameworkBasis}</p>
            </div>
          )}

          {step.evidenceToObtain.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {step.evidenceToObtain.map((item) => (
                <Badge key={item} variant="outline" className="text-[10px] font-normal">
                  {item}
                </Badge>
              ))}
            </div>
          )}

          {step.workpaperNote && (
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-600">Workpaper: </span>
              {step.workpaperNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceSection({ workplan }: { workplan: FilteredControlWorkplanView }) {
  if (workplan.evidenceRequired.length === 0) {
    return (
      <EmptySection
        icon={FileCheck}
        title="No evidence in this framework view"
        description="Broaden the framework filter or add evidence mappings for the selected requirements."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
        Missing or unvalidated documentation should be reflected as a gap in the assessment workpaper.
      </div>

      {workplan.evidenceRequired.map((item) => (
        <section
          key={item.id}
          className={cn(
            "overflow-hidden rounded-2xl border bg-white shadow-sm",
            item.critical ? "border-rose-200" : "border-slate-200"
          )}
        >
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.evidenceType}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  item.critical
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                {item.critical ? "Must-have" : "Supporting"}
              </Badge>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              {item.retentionPeriod && <span>Retention: {item.retentionPeriod}</span>}
              {item.collectionMethod && <span>Collection: {item.collectionMethod}</span>}
            </div>
            {item.probe && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Validation probe
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.probe}</p>
                {item.rationale && (
                  <p className="mt-2 text-xs text-slate-500">{item.rationale}</p>
                )}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function WorkshopSection({ workplan }: { workplan: FilteredControlWorkplanView }) {
  if (workplan.workshopBlocks.length === 0) {
    return (
      <EmptySection
        icon={HelpCircle}
        title="No workshop coverage in this framework view"
        description="Select frameworks with linked requirements to surface facilitation questions."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-900">
        Use these questions in workshop sessions to establish whether the control is designed, implemented,
        and operating effectively before requesting documentary evidence.
      </div>

      <SubPillarWorkshopSection
        blocks={workplan.workshopBlocks}
        title={`Workshop facilitation (${workplan.stats.questionCount} questions)`}
      />

      {!workplan.stats.coverageComplete && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Supplemental workshop questions were added to improve requirement coverage. Review all prompts
            before closing the control.
          </p>
        </div>
      )}
    </div>
  );
}

function FrameworkRequirementsCard({ workplan }: { workplan: FilteredControlWorkplanView }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <p className="text-sm font-semibold text-slate-900">Framework coverage</p>
        </div>
      </div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
        {workplan.frameworkRequirements.length === 0 ? (
          <p className="text-sm text-slate-500">No framework requirements linked.</p>
        ) : (
          workplan.frameworkRequirements.map((req) => (
            <div key={req.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{req.frameworkCode}</Badge>
                <Badge variant="outline">{titleCase(req.coverage)}</Badge>
              </div>
              <code className="mt-2 block text-[11px] font-mono text-indigo-700">{req.clauseId}</code>
              <p className="mt-1 text-sm font-medium text-slate-900">{req.title}</p>
              <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-600">
                {req.requirementText}
              </p>
              <p className="mt-2 text-[10px] text-slate-400">
                {req.sourceDocument}
                {req.sourcePage ? ` · ${req.sourcePage}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function WorkplanChecklistCard({ workplan }: { workplan: FilteredControlWorkplanView }) {
  const items = [
    {
      label: "Assessment test program generated",
      complete: workplan.stats.assessmentStepCount > 0,
    },
    {
      label: "Evidence artifacts cataloged",
      complete: workplan.stats.evidenceCount > 0,
    },
    {
      label: "Workshop questions generated",
      complete: workplan.stats.questionCount > 0,
    },
    {
      label: "Framework requirements mapped",
      complete: workplan.stats.requirementCount > 0,
    },
    {
      label: "Requirement coverage complete",
      complete: workplan.stats.coverageComplete,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold text-slate-900">Assessment checklist</p>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              item.complete
                ? "border-emerald-100 bg-emerald-50/60 text-emerald-900"
                : "border-slate-100 bg-slate-50 text-slate-600"
            )}
          >
            {item.complete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            )}
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptySection({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ListChecks;
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
