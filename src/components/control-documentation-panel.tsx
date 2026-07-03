"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileCheck,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldQuestion,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { controlDocumentationDescription } from "@/lib/transcript-evidence";
import type {
  DocumentationValidationItem,
  DocumentationValidationStatus,
} from "@/lib/governance-v2/types";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type FrameworkObligation = {
  frameworkCode: string;
  clauseId: string;
  title: string;
  requirementText: string;
  coverage: string;
};

type ExpectedDocumentation = {
  id: string;
  evidenceType: string;
  description: string;
  retentionPeriod: string | null;
  collectionMethod: string | null;
};

type UploadedControlFile = {
  id: string;
  fileName: string;
  uploadedAt: string;
  hasText: boolean;
  textPreview: string;
};

type DocumentationPackage = {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string;
  ownerRole: string;
  frameworkObligations: FrameworkObligation[];
  expectedDocumentation: ExpectedDocumentation[];
  procedure: { steps: string; responsibleRole: string; linkedPolicy: string | null } | null;
  uploadedFiles: UploadedControlFile[];
  validation: {
    validatedAt: string;
    overallStatus: string;
    coveragePct: number;
    summary: string;
    items: DocumentationValidationItem[];
  } | null;
};

const STATUS_META: Record<
  DocumentationValidationStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  validated: {
    label: "Validated",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    className: "bg-amber-50 text-amber-900 ring-amber-200",
    icon: ShieldQuestion,
  },
  claimed_only: {
    label: "Claimed only",
    className: "bg-orange-50 text-orange-900 ring-orange-200",
    icon: ShieldAlert,
  },
  missing: {
    label: "Missing",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    icon: XCircle,
  },
  not_validated: {
    label: "Not validated",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    icon: XCircle,
  },
  not_applicable: {
    label: "N/A",
    className: "bg-slate-50 text-slate-600 ring-slate-200",
    icon: FileText,
  },
};

const ACCEPT = ".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Props = {
  assessmentId: string;
  controlCode: string;
  onValidationChange?: () => void;
  compactRequirements?: boolean;
};

export function ControlDocumentationPanel({
  assessmentId,
  controlCode,
  onValidationChange,
  compactRequirements,
}: Props) {
  const [pkg, setPkg] = useState<DocumentationPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [reqOpen, setReqOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingEvidenceType, setPendingEvidenceType] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assessments/${assessmentId}/control-documentation?controlCode=${encodeURIComponent(controlCode)}`
      );
      const data = await res.json();
      if (res.ok) setPkg(data);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, controlCode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runValidation() {
    setValidating(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/control-documentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", controlCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");
      setPkg(data);
      onValidationChange?.();
      toast("Documentation validation complete.", { variant: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Validation failed", { variant: "error" });
    } finally {
      setValidating(false);
    }
  }

  function triggerUpload(evidenceType: string) {
    setPendingEvidenceType(evidenceType);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file || !pendingEvidenceType) return;
    setUploadingFor(pendingEvidenceType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("controlCodes", controlCode);
      formData.append(
        "description",
        controlDocumentationDescription(controlCode, pendingEvidenceType)
      );
      formData.append("category", "control_documentation");

      const res = await fetch(`/api/assessments/${assessmentId}/repository`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      toast(`Uploaded ${file.name} for ${controlCode}.`, { variant: "success" });
      await load();
      await runValidation();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", { variant: "error" });
    } finally {
      setUploadingFor(null);
      setPendingEvidenceType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading control requirements…
      </div>
    );
  }

  if (!pkg) return null;

  const validationItems = pkg.validation?.items ?? [];
  const itemByExpectedId = new Map(validationItems.map((i) => [i.expectedEvidenceId, i]));

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Canonical control requirement
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-800">{pkg.controlDescription}</p>
        {pkg.procedure && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Operating procedure · {pkg.procedure.responsibleRole}
            </p>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
              {pkg.procedure.steps}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setReqOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-indigo-50/40"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-900">Framework obligations</span>
            <Badge variant="outline" className="text-[10px]">
              {pkg.frameworkObligations.length}
            </Badge>
          </div>
          {reqOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>
        {reqOpen && (
          <div className="max-h-64 space-y-2 overflow-y-auto border-t border-indigo-50 px-4 py-3 [scrollbar-width:thin]">
            {pkg.frameworkObligations.length === 0 ? (
              <p className="text-xs text-slate-500">No framework crosswalk linked for this control.</p>
            ) : (
              pkg.frameworkObligations.map((o) => (
                <div key={`${o.frameworkCode}-${o.clauseId}`} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-indigo-700">
                      {o.frameworkCode} {o.clauseId}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {o.coverage} coverage
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-800">{o.title}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-600">
                    {o.requirementText}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setDocsOpen((v) => !v)}
            className="flex items-center gap-2 text-left"
          >
            <FileCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-900">Required documentation</span>
            {pkg.validation && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  pkg.validation.overallStatus === "complete"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : pkg.validation.overallStatus === "partial"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                )}
              >
                {pkg.validation.coveragePct}% validated
              </Badge>
            )}
            {docsOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={validating}
            onClick={() => void runValidation()}
          >
            {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
            Validate documentation
          </Button>
        </div>

        {docsOpen && (
          <div className="space-y-3 p-4">
            {pkg.validation?.summary && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                {pkg.validation.summary}
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-slate-500">
              Workshop claims are not audit-ready — upload the policy, record, or artifact and validate against
              the control requirement. Missing uploads appear in Gaps after sync.
            </p>

            {(pkg.expectedDocumentation.length > 0
              ? pkg.expectedDocumentation
              : [
                  {
                    id: "default",
                    evidenceType: "Supporting documentation",
                    description: `Evidence demonstrating ${pkg.controlTitle}.`,
                    retentionPeriod: null,
                    collectionMethod: null,
                  },
                ]
            ).map((expected) => {
              const item = itemByExpectedId.get(expected.id);
              const status = item?.status ?? "missing";
              const meta = STATUS_META[status];
              const StatusIcon = meta.icon;
              const isUploading = uploadingFor === expected.evidenceType;

              return (
                <div
                  key={expected.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{expected.evidenceType}</p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                            meta.className
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        {item?.workshopClaimed && status !== "validated" && (
                          <span className="text-[10px] text-amber-700">Discussed in workshop</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{expected.description}</p>
                      {(expected.retentionPeriod || expected.collectionMethod) && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {expected.retentionPeriod && `Retention: ${expected.retentionPeriod}`}
                          {expected.retentionPeriod && expected.collectionMethod && " · "}
                          {expected.collectionMethod && `Collection: ${expected.collectionMethod}`}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-1 text-xs"
                      disabled={isUploading || validating}
                      onClick={() => triggerUpload(expected.evidenceType)}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Upload proof
                    </Button>
                  </div>

                  {item?.validationNotes && (
                    <p className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-700">
                      {item.validationNotes}
                    </p>
                  )}

                  {item && item.uploadedFileNames.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.uploadedFileNames.map((name) => (
                        <Badge key={name} variant="outline" className="text-[10px] font-normal">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {pkg.uploadedFiles.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  All uploads for this control
                </p>
                <ul className="mt-2 space-y-1">
                  {pkg.uploadedFiles.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{f.fileName}</span>
                      {!f.hasText && (
                        <span className="text-[10px] text-amber-600">No extractable text</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
