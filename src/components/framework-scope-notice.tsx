"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info, Shield } from "lucide-react";
import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { cn } from "@/lib/utils";

const FRAMEWORK_LABELS: Record<string, string> = {
  "NIST-AI-RMF": "NIST AI RMF",
  "ISO-42001": "ISO 42001",
  "EU-AIA": "EU AI Act",
  "OECD-AI": "OECD AI Principles",
  "COSO-ERM": "COSO ERM 2017",
};

function frameworkColor(code: string): string {
  return FRAMEWORK_COLUMNS.find((f) => f.code === code)?.color ?? "bg-slate-500";
}

type Entry = {
  code: string;
  label: string;
  requirementCount: number;
  scopeNote: string;
  textNote?: string;
  color: string;
};

function buildEntries(codes?: string[]): Entry[] {
  const list = codes?.length
    ? codes.map((c) => ({ code: c, ...FRAMEWORK_SCOPE[c] })).filter((e) => e.scopeNote)
    : Object.entries(FRAMEWORK_SCOPE).map(([code, v]) => ({ code, ...v }));

  return list.map((e) => ({
    code: e.code,
    label: FRAMEWORK_LABELS[e.code] ?? e.code,
    requirementCount: e.requirementCount,
    scopeNote: e.scopeNote,
    textNote: e.textNote,
    color: frameworkColor(e.code),
  }));
}

function FrameworkScopeCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: Entry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-all",
        expanded
          ? "border-slate-300 bg-white shadow-sm"
          : "border-slate-200/90 bg-slate-50/50 hover:border-slate-300"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", entry.color)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{entry.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
              {entry.requirementCount} requirements
            </span>
          </div>
          {!expanded && (
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{entry.scopeNote}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-xs leading-relaxed text-slate-600">{entry.scopeNote}</p>
          {entry.textNote && (
            <div className="mt-3 flex gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed text-amber-900/90">{entry.textNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FrameworkScopeNotice({
  codes,
  compact = false,
  variant = "default",
}: {
  codes?: string[];
  compact?: boolean;
  /** `panel` — client-facing card grid (maturity survey). `default` — collapsible disclosure. */
  variant?: "default" | "panel";
}) {
  const entries = useMemo(() => buildEntries(codes), [codes]);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  if (entries.length === 0) return null;

  const totalRows = entries.reduce((sum, e) => sum + e.requirementCount, 0);
  const resolvedVariant = variant === "panel" ? "panel" : compact ? "compact" : "default";

  if (resolvedVariant === "panel") {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <Shield className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Framework coverage</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {entries.length} framework{entries.length === 1 ? "" : "s"} · {totalRows} mapped
              requirements in the control library
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <FrameworkScopeCard
              key={entry.code}
              entry={entry}
              expanded={expandedCode === entry.code}
              onToggle={() =>
                setExpandedCode((prev) => (prev === entry.code ? null : entry.code))
              }
            />
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
          Coverage reflects ingested requirement rows used for control mapping — not necessarily
          every clause in the published standard. Tap a framework for scope details.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-slate-50/80"
      role="note"
      aria-label="Framework scope disclosure"
    >
      <button
        type="button"
        onClick={() => setDisclosureOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Framework scope & provenance
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm">
            {totalRows} rows
          </span>
        </div>
        {disclosureOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {disclosureOpen && (
        <div className="space-y-2 border-t border-slate-200/80 px-3 pb-3 pt-3">
          {!compact && (
            <p className="px-1 text-xs leading-relaxed text-slate-500">
              Source-verified requirement rows from seeded manifests. Counts reflect ingested
              coverage only.
            </p>
          )}
          {entries.map((entry) => (
            <FrameworkScopeCard
              key={entry.code}
              entry={entry}
              expanded={expandedCode === entry.code}
              onToggle={() =>
                setExpandedCode((prev) => (prev === entry.code ? null : entry.code))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
