"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GitCompare,
  Info,
  Layers,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Citation } from "@/components/cited-analysis";
import { openSharedEvidenceCitation, useEvidenceDrawer } from "@/components/evidence-drawer";
import { ControlMappingAssessment } from "@/components/control-mapping-assessment";
import { FLAG_LABELS } from "@/lib/governance-v2/mapping-metrics";
import type { ExplainabilityPayload } from "@/lib/governance-v2/types";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type LinkedEvidence = {
  id: string;
  rawText: string;
  confidenceScore: number;
  sourceFileName: string | null;
  sourceEvidenceId: string | null;
};

type MappingRow = {
  id: string;
  controlId?: string;
  complianceStatus: string;
  mappingConfidence: number | null;
  evidenceStrength: number | null;
  implementationStatus: string | null;
  ambiguityFlags: string[];
  inPlaceFindings: string;
  gapFindings: string;
  recommendations: string;
  control: { code: string; title: string; ownerRole: string };
  disagreements: Array<{ id: string; status: string; mismatchReason: string | null }>;
  citations: Citation[];
  linkedEvidence: LinkedEvidence[];
  explainability: ExplainabilityPayload | null;
};

type PillarGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  controls: Array<{ id: string; code: string; title: string }>;
};

type PillarNavGroup = {
  pillarId: string;
  pillarLabel: string;
  pillarDescription: string;
  rows: MappingRow[];
};

type Props = {
  assessmentId: string;
  pillars?: PillarGroup[];
  workshopNotes?: string;
  facilitatorNotes?: string;
  evidenceTexts?: Record<string, { fileName: string; text: string }>;
};

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

const VERIFICATION_STYLES = {
  source_grounded: {
    label: "Source grounded",
    short: "Grounded",
    icon: ShieldCheck,
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  partially_grounded: {
    label: "Partially grounded",
    short: "Partial",
    icon: Info,
    chip: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
  },
  unverified: {
    label: "Needs review",
    short: "Review",
    icon: ShieldAlert,
    chip: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
  },
} as const;

type VerificationId = keyof typeof VERIFICATION_STYLES;
type VerificationFilter = VerificationId | "all";

function scoreTone(value: number | null): string {
  if (value == null) return "text-slate-400";
  if (value >= 0.7) return "text-emerald-600";
  if (value >= 0.45) return "text-amber-600";
  return "text-rose-600";
}

function barTone(value: number | null): string {
  if (value == null) return "bg-slate-300";
  if (value >= 0.7) return "bg-emerald-500";
  if (value >= 0.45) return "bg-amber-500";
  return "bg-rose-500";
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function verificationIdForRow(row: MappingRow): VerificationId {
  return (row.explainability?.scoreBreakdown?.verificationStatus ?? "unverified") as VerificationId;
}

function buildPillarNavGroups(rows: MappingRow[], pillars?: PillarGroup[]): PillarNavGroup[] {
  if (!pillars?.length) {
    return [
      {
        pillarId: "all",
        pillarLabel: "All controls",
        pillarDescription: "",
        rows: [...rows].sort((a, b) => a.control.code.localeCompare(b.control.code)),
      },
    ];
  }

  const codeToPillar = new Map<string, Omit<PillarNavGroup, "rows">>();
  for (const pillar of pillars) {
    for (const control of pillar.controls) {
      codeToPillar.set(control.code, {
        pillarId: pillar.pillarId,
        pillarLabel: pillar.pillarLabel,
        pillarDescription: pillar.pillarDescription,
      });
    }
  }

  const grouped = new Map<string, PillarNavGroup>();
  const ungrouped: MappingRow[] = [];

  for (const row of rows) {
    const meta = codeToPillar.get(row.control.code);
    if (!meta) {
      ungrouped.push(row);
      continue;
    }
    const existing = grouped.get(meta.pillarId) ?? { ...meta, rows: [] };
    existing.rows.push(row);
    grouped.set(meta.pillarId, existing);
  }

  const ordered = pillars
    .map((pillar) => grouped.get(pillar.pillarId))
    .filter((group): group is PillarNavGroup => Boolean(group && group.rows.length > 0));

  if (ungrouped.length > 0) {
    ordered.push({
      pillarId: "other",
      pillarLabel: "Other controls",
      pillarDescription: "",
      rows: ungrouped.sort((a, b) => a.control.code.localeCompare(b.control.code)),
    });
  }

  return ordered;
}

function PillarNavigator({
  groups,
  selectedId,
  expandedPillars,
  onTogglePillar,
  onSelect,
}: {
  groups: PillarNavGroup[];
  selectedId: string | null;
  expandedPillars: Set<string>;
  onTogglePillar: (pillarId: string) => void;
  onSelect: (id: string) => void;
}) {
  if (groups.length === 1 && groups[0].pillarId === "all") {
    return (
      <div className="space-y-0.5 p-2">
        {groups[0].rows.map((row) => (
          <MappingListItem key={row.id} row={row} selected={row.id === selectedId} onSelect={() => onSelect(row.id)} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {groups.map((group, idx) => {
        const expanded = expandedPillars.has(group.pillarId);
        const hasSelected = group.rows.some((r) => r.id === selectedId);
        const grounded = group.rows.filter((r) => verificationIdForRow(r) === "source_grounded").length;

        return (
          <div
            key={group.pillarId}
            className={cn(
              "overflow-hidden rounded-xl border bg-white shadow-sm",
              hasSelected ? "border-indigo-200 ring-1 ring-indigo-100" : "border-slate-200/80"
            )}
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
                    {group.rows.length} control{group.rows.length === 1 ? "" : "s"}
                  </span>
                  {grounded > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      {grounded} grounded
                    </span>
                  )}
                </div>
              </div>
            </button>

            {expanded && (
              <div className="space-y-0.5 border-t border-slate-100 bg-slate-50/40 p-2">
                {group.rows
                  .sort((a, b) => a.control.code.localeCompare(b.control.code))
                  .map((row) => (
                    <MappingListItem
                      key={row.id}
                      row={row}
                      selected={row.id === selectedId}
                      onSelect={() => onSelect(row.id)}
                      compact
                    />
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MappingListItem({
  row,
  selected,
  onSelect,
  compact,
}: {
  row: MappingRow;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const verId = verificationIdForRow(row);
  const verStyle = VERIFICATION_STYLES[verId];
  const VerIcon = verStyle.icon;
  const docCoverage = row.explainability?.documentationValidation?.coveragePct;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-all",
        selected ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-700 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-2">
        <VerIcon className={cn("h-3 w-3 shrink-0", selected ? "text-indigo-200" : "text-slate-400")} />
        <span className={cn("font-mono text-[11px] font-bold", selected ? "text-indigo-100" : "text-indigo-600")}>
          {row.control.code}
        </span>
        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold ring-1",
            selected ? "bg-white/10 text-white ring-white/20" : verStyle.chip
          )}
        >
          {compact ? verStyle.short : verStyle.short}
        </span>
      </div>
      <span className={cn("mt-0.5 line-clamp-2 text-xs leading-snug", selected ? "text-indigo-50" : "text-slate-600")}>
        {row.control.title}
      </span>
      {docCoverage != null && (
        <span
          className={cn(
            "mt-1 inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[9px] font-medium tabular-nums",
            selected
              ? "bg-white/10 text-indigo-100"
              : docCoverage >= 100
                ? "bg-emerald-50 text-emerald-700"
                : docCoverage > 0
                  ? "bg-amber-50 text-amber-800"
                  : "bg-rose-50 text-rose-700"
          )}
        >
          Docs {docCoverage}%
        </span>
      )}
      {!compact && (
        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "w-fit text-[9px]",
              selected ? "border-white/30 bg-white/10 text-white" : STATUS_COLORS[row.complianceStatus] ?? ""
            )}
          >
            {STATUS_LABELS[row.complianceStatus] ?? row.complianceStatus}
          </Badge>
          <span className={cn("text-[10px] tabular-nums", selected ? "text-indigo-200" : "text-slate-400")}>
            {formatPct(row.mappingConfidence)} trace
          </span>
        </div>
      )}
    </button>
  );
}

function MappingDetail({
  row,
  assessmentId,
  pillarLabel,
  pillarDescription,
  onBack,
  showBack,
  onDocumentationValidated,
  workshopNotes,
  facilitatorNotes,
  evidenceTexts,
}: {
  row: MappingRow;
  assessmentId: string;
  pillarLabel?: string;
  pillarDescription?: string;
  onBack?: () => void;
  showBack?: boolean;
  onDocumentationValidated?: () => void;
  workshopNotes: string;
  facilitatorNotes: string;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
}) {
  const evidenceDrawer = useEvidenceDrawer();
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCitation, setDialogCitation] = useState<Citation | null>(null);

  const openCitation = useCallback(
    (citation: Citation) => {
      setActiveCitation(citation.citationIndex);
      const opened = openSharedEvidenceCitation(evidenceDrawer, citation);
      if (!opened) {
        setDialogCitation(citation);
        setDialogOpen(true);
      }
    },
    [evidenceDrawer]
  );

  const openCitationByIndex = useCallback(
    (index: number) => {
      const citation = row.citations.find((c) => c.citationIndex === index);
      if (citation) openCitation(citation);
    },
    [row.citations, openCitation]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showBack && onBack && (
        <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-2 lg:hidden">
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1.5 px-2">
            <ArrowLeft className="h-4 w-4" />
            All controls
          </Button>
        </div>
      )}

      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <BookOpen className="h-3.5 w-3.5" />
          Control assessment
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 [scrollbar-width:thin]">
        <ControlMappingAssessment
          row={row}
          assessmentId={assessmentId}
          pillarLabel={pillarLabel}
          pillarDescription={pillarDescription}
          activeCitation={activeCitation}
          onCitationClick={openCitationByIndex}
          onDocumentationValidated={onDocumentationValidated}
          workshopNotes={workshopNotes}
          facilitatorNotes={facilitatorNotes}
          evidenceTexts={evidenceTexts}
          dialogOpen={dialogOpen}
          dialogCitation={dialogCitation}
          onDialogOpenChange={setDialogOpen}
          showEvidenceDialog={!evidenceDrawer}
        />
      </div>
    </div>
  );
}

export function GovernanceMappingPanel({
  assessmentId,
  pillars,
  workshopNotes = "",
  facilitatorNotes = "",
  evidenceTexts = {},
}: Props) {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapping, setMapping] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>("all");
  const [sort, setSort] = useState<"needs_review" | "lowest_traceability" | "lowest_strength" | "a_to_z">(
    "needs_review"
  );
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/intelligence`);
      const data = await res.json();
      setRows(data.mapping ?? []);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const grounded = rows.filter((r) => verificationIdForRow(r) === "source_grounded").length;
    const partial = rows.filter((r) => verificationIdForRow(r) === "partially_grounded").length;
    const unverified = rows.filter((r) => verificationIdForRow(r) === "unverified").length;
    const avgTrace =
      rows.length > 0
        ? rows.reduce((sum, r) => sum + (r.mappingConfidence ?? 0), 0) / rows.length
        : null;
    return { total: rows.length, grounded, partial, unverified, avgTrace };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (verificationFilter !== "all" && verificationIdForRow(r) !== verificationFilter) return false;
      if (!q) return true;
      const hay = `${r.control.code} ${r.control.title} ${r.control.ownerRole}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, verificationFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const needsReviewScore = (r: MappingRow) => {
      const v = verificationIdForRow(r);
      const verWeight = v === "unverified" ? 3 : v === "partially_grounded" ? 2 : 0;
      const lowTrace =
        r.mappingConfidence == null ? 2 : r.mappingConfidence < 0.45 ? 2 : r.mappingConfidence < 0.7 ? 1 : 0;
      return verWeight + lowTrace + (r.disagreements.length > 0 ? 2 : 0);
    };

    list.sort((a, b) => {
      if (sort === "a_to_z") return a.control.code.localeCompare(b.control.code);
      if (sort === "lowest_traceability") return (a.mappingConfidence ?? -1) - (b.mappingConfidence ?? -1);
      if (sort === "lowest_strength") return (a.evidenceStrength ?? -1) - (b.evidenceStrength ?? -1);
      const diff = needsReviewScore(b) - needsReviewScore(a);
      return diff !== 0 ? diff : a.control.code.localeCompare(b.control.code);
    });
    return list;
  }, [filtered, sort]);

  const navGroups = useMemo(() => buildPillarNavGroups(sorted, pillars), [sorted, pillars]);

  useEffect(() => {
    if (navGroups.length === 0) return;
    setExpandedPillars((prev) => {
      if (prev.size > 0) return prev;
      return new Set(navGroups.map((g) => g.pillarId));
    });
  }, [navGroups]);

  const selectedRow = useMemo(() => {
    if (sorted.length === 0) return null;
    return sorted.find((r) => r.id === selectedId) ?? sorted[0];
  }, [sorted, selectedId]);

  const selectedPillarMeta = useMemo(() => {
    if (!selectedRow) return null;
    for (const group of navGroups) {
      if (group.rows.some((r) => r.id === selectedRow.id)) {
        return { pillarLabel: group.pillarLabel, pillarDescription: group.pillarDescription };
      }
    }
    return null;
  }, [navGroups, selectedRow]);

  useEffect(() => {
    if (selectedRow && selectedRow.id !== selectedId) {
      setSelectedId(selectedRow.id);
    }
  }, [selectedRow, selectedId]);

  useEffect(() => {
    if (!selectedRow || navGroups.length === 0) return;
    const group = navGroups.find((g) => g.rows.some((r) => r.id === selectedRow.id));
    if (group) {
      setExpandedPillars((prev) => new Set([...prev, group.pillarId]));
    }
  }, [selectedRow, navGroups]);

  function selectRow(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  function backToList() {
    setMobileShowDetail(false);
  }

  function togglePillar(pillarId: string) {
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(pillarId)) next.delete(pillarId);
      else next.add(pillarId);
      return next;
    });
  }

  async function runMapping() {
    setMapping(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/governance-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "map_controls" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mapping failed");
      toast(`Assessment synced for ${data.mappedCount ?? 0} controls.`, { variant: "success" });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", { variant: "error" });
    } finally {
      setMapping(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f6f7f9] text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading traceability…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f6f7f9]">
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Governance intelligence</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Control mapping</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review what workshop discussion and uploaded evidence substantiate against each control — including
              documentation gaps where proof is missing.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void runMapping()}
            disabled={mapping}
            className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {mapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Sync assessment
          </Button>
        </div>

        {rows.length > 0 && (
          <div className="mx-auto mt-4 flex max-w-[1440px] flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["unverified", "Needs review"],
                ["partially_grounded", "Partial"],
                ["source_grounded", "Grounded"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVerificationFilter(id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  verificationFilter === id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1440px] px-6 py-6">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <GitCompare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-800">No traceability data yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Run analysis in the Evidence tab first, then sync traceability here.
              </p>
            </div>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100">
                      <GitCompare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                        Source-grounded linkage
                      </p>
                      <h3 className="mt-0.5 text-lg font-semibold text-slate-900">Control traceability review</h3>
                      <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        Each control shows how findings connect to uploaded sources. Unanchored claims are flagged and
                        capped until validated.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Controls mapped", value: stats.total },
                    { label: "Source grounded", value: stats.grounded },
                    { label: "Partially grounded", value: stats.partial },
                    { label: "Needs review", value: stats.unverified },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid min-h-[560px] lg:grid-cols-12">
                <aside
                  className={cn(
                    "flex min-h-0 flex-col border-slate-100 bg-slate-50/50 lg:col-span-4 lg:border-r",
                    mobileShowDetail ? "hidden lg:flex" : "flex lg:col-span-4"
                  )}
                >
                  <div className="sticky top-0 z-10 space-y-2 border-b border-slate-100 bg-slate-50/90 p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Layers className="h-3.5 w-3.5" />
                        Risk pillars & controls
                      </div>
                      {navGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPillars(
                              expandedPillars.size === navGroups.length
                                ? new Set()
                                : new Set(navGroups.map((g) => g.pillarId))
                            )
                          }
                          className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {expandedPillars.size === navGroups.length ? "Collapse all" : "Expand all"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                      <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search controls…"
                        className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as typeof sort)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 shadow-sm"
                    >
                      <option value="needs_review">Sort: needs review first</option>
                      <option value="lowest_traceability">Sort: lowest traceability</option>
                      <option value="lowest_strength">Sort: lowest strength</option>
                      <option value="a_to_z">Sort: A → Z</option>
                    </select>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
                    {sorted.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-500">No controls match your filters.</p>
                    ) : (
                      <PillarNavigator
                        groups={navGroups}
                        selectedId={selectedId}
                        expandedPillars={expandedPillars}
                        onTogglePillar={togglePillar}
                        onSelect={selectRow}
                      />
                    )}
                  </div>
                </aside>

                <div
                  className={cn(
                    "min-h-0 flex-col bg-white lg:col-span-8",
                    !mobileShowDetail && "hidden lg:flex",
                    mobileShowDetail && "flex"
                  )}
                >
                  {selectedRow ? (
                    <MappingDetail
                      key={selectedRow.id}
                      row={selectedRow}
                      assessmentId={assessmentId}
                      pillarLabel={selectedPillarMeta?.pillarLabel}
                      pillarDescription={selectedPillarMeta?.pillarDescription}
                      showBack
                      onBack={backToList}
                      onDocumentationValidated={() => void load()}
                      workshopNotes={workshopNotes}
                      facilitatorNotes={facilitatorNotes}
                      evidenceTexts={evidenceTexts}
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
                      Select a control to review traceability
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
