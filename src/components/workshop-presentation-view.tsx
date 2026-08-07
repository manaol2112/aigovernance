"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DepartmentWorkshopGuidePanel,
  PillarWorkshopGuidePanel,
} from "@/components/pillar-workshop-guide";
import type { PillarWorkshopGuide } from "@/lib/pillar-workshop-guide";
import type { DepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import { ALL_DEPARTMENTS } from "@/lib/workshop-department";
import type { WorkshopDepartmentOption } from "@/lib/workshop-departments";

type PillarNav = {
  pillarId: string;
  pillarLabel: string;
  requirementCount: number;
};

type Props = {
  assessmentId: string;
};

export function WorkshopPresentationView({ assessmentId }: Props) {
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);

  const initialMode = searchParams.get("mode") === "department" ? "department" : "pillar";
  const initialPillarId = searchParams.get("pillarId");
  const initialDept = searchParams.get("facilitatorDepartment");
  const scopeDepartment = searchParams.get("department");
  const initialSubPillar = searchParams.get("subPillarId");

  const [assessmentName, setAssessmentName] = useState("");
  const [clientName, setClientName] = useState<string | null>(null);
  const [pillars, setPillars] = useState<PillarNav[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<WorkshopDepartmentOption[]>([]);
  const [runbookMode, setRunbookMode] = useState<"pillar" | "department">(initialMode);
  const [activePillarId, setActivePillarId] = useState<string | null>(initialPillarId);
  const [facilitatorDepartment, setFacilitatorDepartment] = useState(initialDept ?? "");
  const [activeSubPillarId, setActiveSubPillarId] = useState<string | null>(initialSubPillar);
  const [pillarGuide, setPillarGuide] = useState<PillarWorkshopGuide | null>(null);
  const [departmentGuide, setDepartmentGuide] = useState<DepartmentWorkshopGuide | null>(null);
  const [guideLoading, setGuideLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const departmentQuery =
    scopeDepartment && scopeDepartment !== ALL_DEPARTMENTS
      ? `?department=${encodeURIComponent(scopeDepartment)}`
      : "";

  const guideDepartmentQuery =
    scopeDepartment && scopeDepartment !== ALL_DEPARTMENTS
      ? `&department=${encodeURIComponent(scopeDepartment)}`
      : "";

  useEffect(() => {
    async function init() {
      const [workflowRes, reviewRes] = await Promise.all([
        fetch(`/api/assessments/${assessmentId}/workflow`),
        fetch(`/api/assessments/${assessmentId}/control-review${departmentQuery}`),
      ]);
      const workflow = await workflowRes.json();
      const review = await reviewRes.json();
      setAssessmentName(workflow.name ?? "Workshop");
      setClientName(workflow.clientName ?? null);
      setDepartmentOptions(review.departmentOptions ?? []);
      const pillarList: PillarNav[] = (review.pillars ?? []).map(
        (p: { pillarId: string; pillarLabel: string; requirementCount: number }) => ({
          pillarId: p.pillarId,
          pillarLabel: p.pillarLabel,
          requirementCount: p.requirementCount,
        })
      );
      setPillars(pillarList);
      if (!activePillarId && pillarList.length > 0) {
        setActivePillarId(pillarList[0].pillarId);
      }
      if (!facilitatorDepartment && review.departmentOptions?.[0]) {
        setFacilitatorDepartment(review.departmentOptions[0].label);
      }
      setInitLoading(false);
    }
    void init();
  }, [assessmentId, departmentQuery, activePillarId, facilitatorDepartment]);

  const loadGuide = useCallback(async () => {
    setGuideLoading(true);
    try {
      if (runbookMode === "pillar" && activePillarId) {
        const res = await fetch(
          `/api/assessments/${assessmentId}/control-review/guide?pillarId=${activePillarId}${guideDepartmentQuery}`
        );
        const data = await res.json();
        setPillarGuide(data.error ? null : data);
        setDepartmentGuide(null);
      } else if (runbookMode === "department" && facilitatorDepartment) {
        const res = await fetch(
          `/api/assessments/${assessmentId}/control-review/guide?departmentGuide=true&facilitatorDepartment=${encodeURIComponent(facilitatorDepartment)}${guideDepartmentQuery}`
        );
        const data = await res.json();
        setDepartmentGuide(data.error ? null : data);
        setPillarGuide(null);
      }
    } finally {
      setGuideLoading(false);
    }
  }, [activePillarId, assessmentId, facilitatorDepartment, guideDepartmentQuery, runbookMode]);

  useEffect(() => {
    if (initLoading) return;
    void loadGuide();
  }, [initLoading, loadGuide]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!rootRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void rootRef.current.requestFullscreen();
    }
  }

  function selectSubPillar(subPillarId: string | null) {
    setActiveSubPillarId(subPillarId);
    if (subPillarId) {
      requestAnimationFrame(() => {
        document.getElementById(`sub-pillar-${subPillarId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  const sessionTitle =
    runbookMode === "pillar"
      ? pillarGuide?.pillarLabel ?? "Workshop questions"
      : departmentGuide?.departmentLabel ?? "Department runbook";

  const topicOptions =
    runbookMode === "pillar"
      ? (pillarGuide?.subPillars ?? []).map((b) => ({ id: b.subPillarId, label: b.subPillarLabel }))
      : (departmentGuide?.sections ?? []).map(({ block }) => ({
          id: block.subPillarId,
          label: block.subPillarLabel,
        }));

  if (initLoading) {
    return (
      <div className="flex h-dvh items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading presenter view…</span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex h-dvh flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-indigo-600">
            Workshop presenter
          </p>
          <h1 className="truncate text-sm font-semibold text-slate-900">{assessmentName}</h1>
          {(clientName || sessionTitle) && (
            <p className="truncate text-xs text-slate-500">
              {clientName ? `${clientName} · ` : ""}
              {sessionTitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:inline-flex">
            <button
              type="button"
              onClick={() => {
                setRunbookMode("pillar");
                setActiveSubPillarId(null);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                runbookMode === "pillar" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Pillar
            </button>
            <button
              type="button"
              onClick={() => {
                setRunbookMode("department");
                setActiveSubPillarId(null);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                runbookMode === "department" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Department
            </button>
          </div>

          <Button type="button" variant="outline" size="sm" className="h-8" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5 hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </Button>

          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href={`/assessments/${assessmentId}/workflow`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="ml-1.5 hidden sm:inline">Back</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.close()}
            title="Close window"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {topicOptions.length > 1 && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-100 bg-slate-50 px-4 py-2">
          <button
            type="button"
            onClick={() => selectSubPillar(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              !activeSubPillarId ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            All topics
          </button>
          {topicOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectSubPillar(t.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                activeSubPillarId === t.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-slate-100 bg-slate-50/80 md:flex">
          <p className="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {runbookMode === "pillar" ? "Risk pillars" : "Departments"}
          </p>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {runbookMode === "pillar"
              ? pillars.map((pillar) => (
                  <button
                    key={pillar.pillarId}
                    type="button"
                    onClick={() => {
                      setActivePillarId(pillar.pillarId);
                      setActiveSubPillarId(null);
                    }}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-xs font-semibold leading-snug transition-colors ${
                      activePillarId === pillar.pillarId
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    {pillar.pillarLabel}
                  </button>
                ))
              : departmentOptions.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      setFacilitatorDepartment(dept.label);
                      setActiveSubPillarId(null);
                    }}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-xs font-semibold leading-snug transition-colors ${
                      facilitatorDepartment === dept.label
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    {dept.label}
                  </button>
                ))}
          </nav>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto bg-white">
          {guideLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading questions…
            </div>
          ) : runbookMode === "pillar" ? (
            <PillarWorkshopGuidePanel
              guide={pillarGuide}
              activeSubPillarId={activeSubPillarId}
              onSubPillarSelect={selectSubPillar}
              variant="presentation"
              hideHeader
            />
          ) : (
            <DepartmentWorkshopGuidePanel
              guide={departmentGuide}
              activeSubPillarId={activeSubPillarId}
              onSubPillarSelect={selectSubPillar}
              variant="presentation"
              hideHeader
            />
          )}
        </main>
      </div>
    </div>
  );
}
