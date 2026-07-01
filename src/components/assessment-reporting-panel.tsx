"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileBarChart,
  FileText,
  Loader2,
  Lock,
  Map,
  Package,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ControlReviewReportData } from "@/lib/control-review-reports";
import { getDisplayFindings } from "@/lib/report-narrative-generator";
import {
  ComplianceDonutChart,
  MaturityLegend,
  ReviewProgressRing,
  RoadmapTimeline,
} from "@/components/report-visualizations";
import { MaturityGovernanceDashboard } from "@/components/maturity-charts";

type ReportTab = "overview" | "gaps" | "maturity" | "roadmap";

const DELIVERABLES = [
  {
    type: "board_ready_summary",
    title: "Board Governance Summary",
    description: "Executive briefing for board and senior leadership with key metrics and priority risks.",
    icon: TrendingUp,
    accent: "from-violet-600 to-indigo-700",
  },
  {
    type: "gap_assessment_report",
    title: "Gap Assessment Report",
    description: "Formal register of signed-off controls with gap analysis and remediation recommendations.",
    icon: FileText,
    accent: "from-rose-600 to-red-700",
  },
  {
    type: "risk_control_matrix",
    title: "Maturity Assessment Matrix",
    description: "Pillar-by-pillar maturity levels, alignment scores, and framework coverage.",
    icon: BarChart3,
    accent: "from-emerald-600 to-teal-700",
  },
  {
    type: "remediation_roadmap",
    title: "Remediation Roadmap",
    description: "Phased, prioritized action plan sequenced by criticality and gap severity.",
    icon: Map,
    accent: "from-amber-500 to-orange-600",
  },
] as const;

type CheckpointInfo = {
  status: string;
  confirmedBy?: string | null;
  title?: string;
  summary?: string;
};

type Props = {
  assessmentId: string;
  departmentQuery?: string;
  reviewProgress: { confirmed: number; total: number };
  onGoToReview: () => void;
  /** Bumps when review progress changes so reporting can refresh after new sign-offs. */
  refreshKey?: string;
  /** `reporting` = in-workshop preview; `deliverables` = final client package stage */
  variant?: "reporting" | "deliverables";
  evaluationReviewApproved?: boolean;
  onProceedToDeliverables?: (confirmedBy: string) => Promise<void>;
  proceedLoading?: boolean;
  workflowStage?: string;
  deliverableCheckpoint?: CheckpointInfo;
  onApproveDeliverablePackage?: (confirmedBy: string) => Promise<void>;
  onFinalizeAssessment?: () => Promise<void>;
  actionLoading?: string;
};

export function AssessmentReportingPanel({
  assessmentId,
  departmentQuery = "",
  reviewProgress,
  onGoToReview,
  refreshKey = "",
  variant = "reporting",
  evaluationReviewApproved = false,
  onProceedToDeliverables,
  proceedLoading = false,
  workflowStage,
  deliverableCheckpoint,
  onApproveDeliverablePackage,
  onFinalizeAssessment,
  actionLoading = "",
}: Props) {
  const [report, setReport] = useState<ControlReviewReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [attestationName, setAttestationName] = useState("");
  const [deliveryApproverName, setDeliveryApproverName] = useState("");
  const reportRef = useRef<ControlReviewReportData | null>(null);
  reportRef.current = report;
  const isDeliverablesStage = variant === "deliverables";

  const load = useCallback(
    async (opts?: { forceRefresh?: boolean; background?: boolean }) => {
      const hasReport = reportRef.current !== null;
      if (!opts?.background && !hasReport) setLoading(true);
      if (opts?.background || hasReport) setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams(departmentQuery.replace(/^\?/, ""));
        if (opts?.forceRefresh) params.set("refresh", "1");
        const qs = params.toString();
        const res = await fetch(
          `/api/assessments/${assessmentId}/control-review/reports${qs ? `?${qs}` : ""}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load report");
        setReport(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [assessmentId, departmentQuery]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!reportRef.current) return;
    void load({ background: true });
  }, [refreshKey, load]);

  const gapControls = useMemo(
    () =>
      report?.reviewedControls.filter((c) =>
        ["gap", "partial", "not_assessed"].includes(c.complianceStatus)
      ) ?? [],
    [report]
  );

  async function downloadPdf(type: string) {
    setDownloading(type);
    try {
      const res = await fetch(
        `/api/assessments/${assessmentId}/deliverables?type=${type}&format=pdf`
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Download failed");
      }
      const blob = await res.blob();
      if (!blob.type.includes("pdf")) {
        throw new Error("Server did not return a PDF file");
      }
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `${type}.pdf`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not generate PDF report.";
      window.alert(`${message} Please try again.`);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    for (const d of DELIVERABLES) {
      await downloadPdf(d.type);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] flex-1 flex-col items-center justify-center gap-3 bg-slate-50/50">
        <Loader2 className="h-9 w-9 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-500">Preparing assessment reporting package…</p>
        <p className="text-xs text-slate-400">
          First load generates executive narratives; later visits use cached results unless findings change.
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="h-full min-h-0 flex-1 overflow-y-auto p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <p className="font-semibold text-rose-900">Could not load reporting data</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: ReportTab; label: string; icon: typeof FileText }> = [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "gaps", label: "Gap register", icon: AlertTriangle },
    { id: "maturity", label: "Maturity", icon: BarChart3 },
    { id: "roadmap", label: "Roadmap", icon: Map },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f6fa]">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        {/* Hero header */}
        <div className="relative shrink-0 overflow-hidden border-b border-slate-200/80 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(79,70,229,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                <Package className="h-3.5 w-3.5" />
                {isDeliverablesStage ? "Client delivery package" : "Formal deliverables"}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                {report.clientName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{report.assessmentName}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {isDeliverablesStage
                  ? "Final assessment package for client distribution — executive summaries, gap register, maturity analysis, and remediation roadmap."
                  : "Enterprise PDF reports generated from reviewer-signed controls. Unreviewed items are excluded from all deliverables."}
              </p>
              {refreshing && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing narratives for updated sign-offs…
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <ReviewProgressRing confirmed={reviewProgress.confirmed} total={reviewProgress.total} />
              <p className="text-center text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{reviewProgress.confirmed}</span> of{" "}
                {reviewProgress.total} signed off
              </p>
            </div>
          </div>

          {!report.reviewStats.reportingReady ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-950">
                    {report.reviewStats.pendingReview} control(s) not yet signed off
                  </p>
                  <p className="mt-0.5 text-sm text-amber-800/90">
                    Reports reflect {report.reviewStats.confirmed} confirmed control(s). Complete validation
                    for a full package.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-amber-300 bg-white" onClick={onGoToReview}>
                Complete validation
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">
                {isDeliverablesStage
                  ? workflowStage === "finalized"
                    ? "Assessment finalized — package approved for client delivery"
                    : "Assessment validation complete — formal deliverable package ready"
                  : "Assessment validation complete — deliverable package ready for distribution"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Document package */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white/80 px-6 py-5 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Download report package</h3>
              <p className="text-xs text-slate-500">Professional PDF documents · Board and audit ready</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void downloadAll()}
              disabled={!!downloading || refreshing}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download all (PDF)
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DELIVERABLES.map((doc) => {
              const Icon = doc.icon;
              const isLoading = downloading === doc.type;
              return (
                <div
                  key={doc.type}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${doc.accent}`} />
                  <div className="p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-slate-900">{doc.title}</h4>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500">
                      {doc.description}
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 w-full"
                      variant="outline"
                      disabled={!!downloading}
                      onClick={() => void downloadPdf(doc.type)}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs — sticky while scrolling */}
      <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="mx-auto max-w-6xl space-y-6 pb-8">
          {activeTab === "overview" && (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-start gap-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                    <Shield className="h-7 w-7 text-indigo-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                      Executive summary
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight leading-snug">
                      {report.executiveSummary.headline}
                    </h3>
                    <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
                      {report.executiveSummary.narrative}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm lg:col-span-1">
                  <h4 className="text-sm font-semibold text-slate-900">Compliance distribution</h4>
                  <p className="mt-1 text-xs text-slate-500">Signed-off controls only</p>
                  <div className="mt-6">
                    <ComplianceDonutChart report={report} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                  {[
                    {
                      label: "Controls aligned",
                      value: report.executiveSummary.alignedControls,
                      sub: "Substantially meeting requirements",
                      color: "text-emerald-600",
                      bg: "bg-emerald-50",
                    },
                    {
                      label: "Partial coverage",
                      value: report.executiveSummary.partialControls,
                      sub: "Gaps remain in scope",
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                    },
                    {
                      label: "Material gaps",
                      value: report.executiveSummary.gapControls,
                      sub: "Remediation required",
                      color: "text-red-600",
                      bg: "bg-red-50",
                    },
                    {
                      label: "Pillars at risk",
                      value: report.executiveSummary.pillarsAtRisk,
                      sub: "Gaps outweigh alignment",
                      color: "text-violet-600",
                      bg: "bg-violet-50",
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className={`rounded-2xl border border-slate-200/80 ${kpi.bg} p-5 shadow-sm`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {kpi.label}
                      </p>
                      <p className={`mt-2 text-4xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
                      <p className="mt-1 text-xs text-slate-600">{kpi.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {report.executiveSummary.topGaps.length > 0 && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileBarChart className="h-5 w-5 text-red-600" />
                      <h4 className="text-sm font-semibold text-slate-900">Priority risks for leadership</h4>
                    </div>
                    {report.executiveSummary.narrativesSource === "ai" && (
                      <Badge variant="outline" className="text-[10px] text-slate-500">
                        AI-polished · grounded in signed-off findings
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {report.executiveSummary.topGaps.map((g, i) => (
                      <div
                        key={g.controlCode}
                        className="flex gap-3 rounded-xl border border-red-100 bg-gradient-to-r from-red-50/80 to-white p-4"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{g.controlTitle}</p>
                          <p className="text-[10px] font-semibold uppercase text-red-600/80">{g.pillarLabel}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-700">{g.summary}</p>
                          {g.businessImpact && (
                            <p className="mt-2 text-xs leading-relaxed text-slate-500">
                              <span className="font-semibold text-slate-600">Recommended focus:</span>{" "}
                              {g.businessImpact}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.executiveSummary.boardActions.length > 0 && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Recommended board actions</h4>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {report.executiveSummary.boardActions.map((action) => (
                      <li key={action} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === "gaps" && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Formal gap register</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {report.reviewedControls.length} signed-off controls · {gapControls.length} with gaps
                    or partial alignment
                  </p>
                </div>
                <Button size="sm" onClick={() => void downloadPdf("gap_assessment_report")} disabled={!!downloading}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export gap report (PDF)
                </Button>
              </div>

              {report.reviewedControls.length === 0 ? (
                <EmptyReportState onGoToReview={onGoToReview} />
              ) : (
                <div className="space-y-3">
                  {report.reviewedControls.map((ctrl) => (
                    <GapRegisterCard
                      key={ctrl.controlId}
                      ctrl={ctrl}
                      clientName={report.clientName}
                      expanded={expandedGap === ctrl.controlId}
                      onToggle={() =>
                        setExpandedGap(expandedGap === ctrl.controlId ? null : ctrl.controlId)
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "maturity" && (
            <>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900">AI governance maturity dashboard</h4>
                <p className="mt-1 text-sm text-slate-500">
                  NIST AI RMF–style pillar view · alignment web, compliance stacks, and maturity bands from
                  signed-off controls only
                </p>
                <div className="mt-4">
                  <MaturityLegend />
                </div>
              </div>
              <MaturityGovernanceDashboard report={report} />
            </>
          )}

          {activeTab === "roadmap" && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Remediation roadmap</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Prioritized by pillar criticality and gap severity · {report.roadmap.length} action
                    items
                  </p>
                </div>
                <Button size="sm" onClick={() => void downloadPdf("remediation_roadmap")} disabled={!!downloading}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export roadmap (PDF)
                </Button>
              </div>
              {report.roadmap.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
                  <Map className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 font-medium text-slate-700">No roadmap items yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Sign off controls with gaps to build the prioritized remediation plan.
                  </p>
                </div>
              ) : (
                <RoadmapTimeline steps={report.roadmap} />
              )}
            </>
          )}
        </div>

          {!isDeliverablesStage &&
            report.reviewStats.reportingReady &&
            onProceedToDeliverables && (
              <ProceedToDeliverablesCard
                evaluationReviewApproved={evaluationReviewApproved}
                attestationName={attestationName}
                onAttestationNameChange={setAttestationName}
                loading={proceedLoading}
                onProceed={async () => {
                  if (!evaluationReviewApproved && !attestationName.trim()) {
                    window.alert("Enter your name to attest the completed assessment review.");
                    return;
                  }
                  await onProceedToDeliverables(attestationName.trim());
                }}
              />
            )}

          {isDeliverablesStage && (
            <DeliverablesApprovalCard
              workflowStage={workflowStage}
              deliverableCheckpoint={deliverableCheckpoint}
              approverName={deliveryApproverName}
              onApproverNameChange={setDeliveryApproverName}
              actionLoading={actionLoading}
              onApprove={async () => {
                if (!deliveryApproverName.trim()) {
                  window.alert("Enter your name before approving the package for delivery.");
                  return;
                }
                await onApproveDeliverablePackage?.(deliveryApproverName.trim());
              }}
              onFinalize={() => onFinalizeAssessment?.()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProceedToDeliverablesCard({
  evaluationReviewApproved,
  attestationName,
  onAttestationNameChange,
  loading,
  onProceed,
}: {
  evaluationReviewApproved: boolean;
  attestationName: string;
  onAttestationNameChange: (v: string) => void;
  loading: boolean;
  onProceed: () => Promise<void>;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-10">
      <div className="overflow-hidden rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-md">
        <div className="h-1 bg-gradient-to-r from-indigo-600 to-violet-600" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <ArrowRight className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Proceed to deliverables</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {evaluationReviewApproved
                ? "Open the formal client delivery package. PDFs and previews below will become your locked deliverable set."
                : "Attest that all controls are reviewed and accurate, then lock the assessment and open the deliverable package."}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[240px]">
            {!evaluationReviewApproved && (
              <input
                className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm"
                placeholder="Reviewer name (attestation)"
                value={attestationName}
                onChange={(e) => onAttestationNameChange(e.target.value)}
              />
            )}
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
              onClick={() => void onProceed()}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {evaluationReviewApproved ? "Open deliverable package" : "Attest & open deliverables"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliverablesApprovalCard({
  workflowStage,
  deliverableCheckpoint,
  approverName,
  onApproverNameChange,
  actionLoading,
  onApprove,
  onFinalize,
}: {
  workflowStage?: string;
  deliverableCheckpoint?: CheckpointInfo;
  approverName: string;
  onApproverNameChange: (v: string) => void;
  actionLoading: string;
  onApprove: () => Promise<void>;
  onFinalize: () => void;
}) {
  const isFinalized = workflowStage === "finalized";
  const isApproved = deliverableCheckpoint?.status === "approved";

  return (
    <div className="mx-auto max-w-6xl px-6 pb-10">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              {isFinalized ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <Shield className="h-6 w-6 text-emerald-700" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {isFinalized ? "Assessment finalized" : "Approve package for client delivery"}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {isFinalized
                  ? "This assessment is complete. Download the PDF package above for client handoff."
                  : isApproved
                    ? `Deliverable package approved${deliverableCheckpoint?.confirmedBy ? ` by ${deliverableCheckpoint.confirmedBy}` : ""}. Finalize to mark the assessment complete.`
                    : "Review the package above, then approve to confirm it is ready for the client."}
              </p>
            </div>
          </div>

          {!isFinalized && deliverableCheckpoint?.status === "pending" && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <Lock className="h-5 w-5 shrink-0 text-amber-700" />
              <div className="min-w-0 flex-1 text-sm text-amber-900">
                <p className="font-medium">Delivery approval required</p>
                {deliverableCheckpoint.summary && (
                  <p className="mt-1 whitespace-pre-wrap text-amber-800/90">{deliverableCheckpoint.summary}</p>
                )}
              </div>
              <input
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                placeholder="Approver name"
                value={approverName}
                onChange={(e) => onApproverNameChange(e.target.value)}
              />
              <Button
                onClick={() => void onApprove()}
                disabled={actionLoading === "approve_checkpoint"}
              >
                {actionLoading === "approve_checkpoint" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve package
              </Button>
            </div>
          )}

          {!isFinalized && isApproved && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                onClick={onFinalize}
                disabled={actionLoading === "finalize"}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {actionLoading === "finalize" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Finalize assessment
              </Button>
            </div>
          )}

          {isFinalized && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Assessment finalized and ready for client delivery.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyReportState({ onGoToReview }: { onGoToReview: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
      <FileText className="mx-auto h-12 w-12 text-slate-300" />
      <p className="mt-4 font-medium text-slate-700">No signed-off controls yet</p>
      <p className="mt-1 text-sm text-slate-500">Complete control validation to populate formal reports.</p>
      <Button className="mt-6" size="sm" onClick={onGoToReview}>
        Go to validation
      </Button>
    </div>
  );
}

function GapRegisterCard({
  ctrl,
  clientName,
  expanded,
  onToggle,
}: {
  ctrl: ControlReviewReportData["reviewedControls"][number];
  clientName: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusStyles =
    ctrl.complianceStatus === "aligned"
      ? "bg-emerald-100 text-emerald-800"
      : ctrl.complianceStatus === "partial"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-indigo-700">{ctrl.controlCode}</span>
            <Badge variant="outline" className="text-[10px]">
              {ctrl.pillarLabel}
            </Badge>
            <Badge className={statusStyles}>{ctrl.complianceStatus.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 font-medium text-slate-800">{ctrl.controlTitle}</p>
          {ctrl.confirmedBy && (
            <p className="mt-1 text-[11px] text-slate-400">
              Attested by {ctrl.confirmedBy}
              {ctrl.confirmedAt &&
                ` · ${new Date(ctrl.confirmedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}`}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-indigo-600">{expanded ? "Hide" : "Details"}</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <FindingBlock title="What's in place" text={getDisplayFindings(ctrl, clientName).inPlace} tone="emerald" />
            <FindingBlock title="Gaps" text={getDisplayFindings(ctrl, clientName).gap} tone="amber" />
            <FindingBlock title="Recommendations" text={getDisplayFindings(ctrl, clientName).recommendation} tone="indigo" />
          </div>
        </div>
      )}
    </div>
  );
}

function FindingBlock({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "emerald" | "amber" | "indigo";
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    indigo: "border-indigo-200 bg-indigo-50/50",
  };
  const headers = {
    emerald: "text-emerald-800",
    amber: "text-amber-900",
    indigo: "text-indigo-900",
  };
  const body = text
    .split("\n")
    .map((l) => l.replace(/\[\{\d+\}\]/g, "").trim())
    .filter(Boolean);

  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${headers[tone]}`}>{title}</p>
      <ul className="mt-2 space-y-1.5">
        {body.map((line, i) => (
          <li key={i} className="text-sm leading-relaxed text-slate-700">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
