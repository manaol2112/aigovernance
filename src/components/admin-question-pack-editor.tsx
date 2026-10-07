"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  QUESTION_PACK_PRODUCT_META,
  getPackPillarCatalog,
  packPillarLabel,
  resolvePackPillarSet,
  type PackPillarSet,
  type QuestionPackProduct,
} from "@/lib/pillar-questionnaire";
import { questionPackCsvTemplate } from "@/lib/question-pack-csv";
import { looksLikeCsvFile, readCsvFileAsText } from "@/lib/read-csv-file-client";
import { evenPackWeights, sumWeights, weightSharePct } from "@/lib/pack-weights";
import { PackPillarWeightMixer, QuestionWeightPicker } from "@/components/pack-weight-controls";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  pillarId: string;
  prompt: string;
  helpText: string | null;
  weight: number;
  sortOrder: number;
  active: boolean;
};

type PillarWeightRow = {
  pillarId: string;
  pillarLabel: string;
  weight: number;
};

type PackPayload = {
  id: string;
  name: string;
  description: string | null;
  product: QuestionPackProduct;
  pillarSet: PackPillarSet;
  questions: Question[];
  pillarWeights: PillarWeightRow[];
  coverage: {
    complete: boolean;
    questionCount: number;
    pillarCount?: number;
    missingPillarIds: string[];
  };
};

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-8 pb-16">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-44 rounded-[28px] bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-100" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function AdminQuestionPackEditor({ packId }: { packId: string }) {
  const router = useRouter();
  const [pack, setPack] = useState<PackPayload | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { prompt: string; helpText: string }>>({});
  const [newPrompt, setNewPrompt] = useState<Record<string, string>>({});
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvImportErrors, setCsvImportErrors] = useState<string[]>([]);
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [pillarWeights, setPillarWeights] = useState<PillarWeightRow[]>([]);
  const [savingWeights, setSavingWeights] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/question-packs/${packId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load pack");
    setPack(data);
    setName(data.name);
    setDescription(data.description ?? "");
    setPillarWeights(data.pillarWeights ?? []);
    setDrafts(
      Object.fromEntries(
        data.questions.map((question: Question) => [
          question.id,
          { prompt: question.prompt, helpText: question.helpText ?? "" },
        ])
      )
    );
  }, [packId]);

  useEffect(() => {
    load()
      .catch((error) => toast(error instanceof Error ? error.message : "Failed to load pack.", { variant: "error" }))
      .finally(() => setLoading(false));
  }, [load]);

  const pillarSet = useMemo(
    () =>
      resolvePackPillarSet({
        pillarSet: pack?.pillarSet,
        name: pack?.name ?? name,
      }),
    [pack?.pillarSet, pack?.name, name]
  );
  const packPillars = useMemo(() => getPackPillarCatalog(pillarSet), [pillarSet]);

  const questionsByPillar = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const pillar of packPillars) map.set(pillar.id, []);
    for (const question of pack?.questions ?? []) {
      const list = map.get(question.pillarId) ?? [];
      list.push(question);
      map.set(question.pillarId, list);
    }
    return map;
  }, [pack, packPillars]);

  const pillarsWithQuestions = useMemo(() => {
    return packPillars.filter((pillar) => (questionsByPillar.get(pillar.id)?.length ?? 0) > 0).length;
  }, [questionsByPillar, packPillars]);

  const orphanQuestions = useMemo(() => {
    const allowed = new Set(packPillars.map((pillar) => pillar.id));
    return (pack?.questions ?? []).filter((question) => !allowed.has(question.pillarId));
  }, [pack?.questions, packPillars]);

  const metaDirty = useMemo(() => {
    if (!pack) return false;
    return name.trim() !== pack.name || (description.trim() || "") !== (pack.description ?? "").trim();
  }, [pack, name, description]);

  const coveragePct = Math.round((pillarsWithQuestions / Math.max(packPillars.length, 1)) * 100);

  function expandAllPillars(expand: boolean) {
    setExpandedPillars(Object.fromEntries(packPillars.map((pillar) => [pillar.id, expand])));
  }

  async function saveMeta() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/question-packs/${packId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast("Pack details saved.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion(question: Question, weight?: number) {
    const draft = drafts[question.id];
    if (!draft && weight == null) return;
    const res = await fetch(`/api/admin/question-packs/${packId}/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: draft?.prompt ?? question.prompt,
        helpText: draft?.helpText ?? question.helpText,
        weight: weight ?? question.weight,
        active: question.active,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save question");
    await load();
  }

  async function persistPillarWeights(next: PillarWeightRow[]) {
    setSavingWeights(true);
    try {
      const res = await fetch(`/api/admin/question-packs/${packId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillarWeights: next.map((row) => ({
            pillarId: row.pillarId,
            weight: row.weight,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save pillar weights");
      setPack(data);
      setPillarWeights(data.pillarWeights ?? next);
      toast("Pillar weights saved.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save weights.", {
        variant: "error",
      });
      await load();
    } finally {
      setSavingWeights(false);
    }
  }

  function updatePillarWeightLocal(pillarId: string, weight: number) {
    setPillarWeights((current) =>
      current.map((row) => (row.pillarId === pillarId ? { ...row, weight } : row))
    );
  }

  async function distributePillarWeightsEvenly() {
    const even = evenPackWeights(pillarWeights.length);
    const next = pillarWeights.map((row, index) => ({
      ...row,
      weight: even[index] ?? 1,
    }));
    setPillarWeights(next);
    await persistPillarWeights(next);
  }

  async function addQuestion(pillarId: string) {
    const prompt = (newPrompt[pillarId] ?? "").trim();
    if (!prompt) return;
    const res = await fetch(`/api/admin/question-packs/${packId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillarId, prompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to add question");
    setNewPrompt((current) => ({ ...current, [pillarId]: "" }));
    setExpandedPillars((current) => ({ ...current, [pillarId]: true }));
    await load();
  }

  async function removeQuestion(questionId: string) {
    const res = await fetch(`/api/admin/question-packs/${packId}/questions/${questionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Failed to delete");
    }
    await load();
  }

  function clearCsvSelection() {
    setCsvText("");
    setCsvFileName(null);
  }

  async function postCsvText(csv: string, mode: "replace" | "append", sourceLabel?: string) {
    setSaving(true);
    setCsvImportErrors([]);
    try {
      const res = await fetch(`/api/admin/question-packs/${packId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const skipped = Array.isArray(data.errors) ? (data.errors as string[]) : [];
      if (skipped.length) {
        setCsvImportErrors(skipped);
        setCsvOpen(true);
        toast(`Imported ${data.imported} rows. ${skipped.length} skipped — see details below.`, {
          variant: "error",
        });
      } else {
        toast(
          sourceLabel
            ? `Imported ${data.imported} questions from ${sourceLabel}.`
            : `Imported ${data.imported} questions.`,
          { variant: "success" }
        );
        clearCsvSelection();
        setCsvOpen(false);
      }
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Import failed.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(mode: "replace" | "append") {
    if (!csvText.trim()) {
      toast("Paste CSV text, or choose a file first.", { variant: "error" });
      return;
    }
    await postCsvText(csvText, mode, csvFileName ?? undefined);
  }

  /**
   * Read via blob: URL (not file.text / FileReader / FormData file upload),
   * then import as JSON — avoids Prisma Access "digest" crashes on file uploads.
   */
  async function importCsvFileDirect(file: File, mode: "replace" | "append") {
    if (!looksLikeCsvFile(file)) {
      toast("Please choose a .csv file.", { variant: "error" });
      return;
    }
    try {
      const text = await readCsvFileAsText(file);
      setCsvFileName(file.name);
      setCsvText(text);
      await postCsvText(text, mode, file.name);
    } catch (error) {
      toast(
        error instanceof Error
          ? `${error.message} If your browser blocks file access, open the CSV and paste it below.`
          : "Could not read that CSV. Open the file and paste it below.",
        { variant: "error" }
      );
    }
  }

  async function loadCsvFileOnly(file: File) {
    if (!looksLikeCsvFile(file)) {
      toast("Please choose a .csv file.", { variant: "error" });
      return;
    }
    try {
      const text = await readCsvFileAsText(file);
      setCsvText(text);
      setCsvFileName(file.name);
      toast(`Loaded ${file.name}. Click Append or Replace to import.`, {
        variant: "success",
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? `${error.message} Open the CSV and paste it into the box below instead.`
          : "Could not read that CSV. Paste it into the box below instead.",
        { variant: "error" }
      );
    }
  }

  function togglePillar(pillarId: string) {
    setExpandedPillars((current) => ({ ...current, [pillarId]: !current[pillarId] }));
  }

  function isPillarExpanded(pillarId: string, questionCount: number) {
    if (expandedPillars[pillarId] != null) return expandedPillars[pillarId];
    return questionCount > 0 || (pack?.coverage.missingPillarIds.includes(pillarId) ?? false);
  }

  if (loading || !pack) {
    return <EditorSkeleton />;
  }

  const productMeta = QUESTION_PACK_PRODUCT_META[pack.product];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-20">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to questionnaires
      </Link>

      {/* Hero */}
      <header className="admin-hero-header brand-ink-surface overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-xl shadow-slate-300/25 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
                {productMeta.label}
              </span>
              {pack.coverage.complete ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready as default
                </span>
              ) : (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                  Coverage incomplete
                </span>
              )}
            </div>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-4 w-full border-none bg-transparent text-2xl font-bold tracking-tight text-white outline-none placeholder:text-slate-500 sm:text-3xl"
              placeholder="Pack name"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description for admins — optional"
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-500 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <Button
            type="button"
            onClick={() => void saveMeta()}
            disabled={saving || !metaDirty}
            className={cn(
              "shrink-0 rounded-xl transition-all",
              metaDirty
                ? "bg-white text-slate-900 shadow-lg shadow-indigo-950/40 hover:bg-slate-100"
                : "border border-white/20 bg-white/10 text-slate-300 hover:bg-white/15"
            )}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {metaDirty ? "Save details" : "Details saved"}
          </Button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>Pillar coverage progress</span>
            <span className="tabular-nums text-slate-300">{coveragePct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pack.coverage.complete ? "bg-emerald-400" : "bg-indigo-400"
              )}
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Active questions
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{pack.coverage.questionCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pillars covered
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {pillarsWithQuestions}
              <span className="text-base font-medium text-slate-400">
                {" "}
                / {packPillars.length}
                {pillarSet === "tmt_6" ? " · TMT" : ""}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Missing pillars
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{pack.coverage.missingPillarIds.length}</p>
          </div>
        </div>
      </header>

      {/* Pillar coverage strip */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          <p className="text-sm font-semibold text-slate-900">Pillar coverage</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Each pillar needs at least one active question before this pack can be set as the workspace default.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {packPillars.map((pillar, index) => {
            const count = questionsByPillar.get(pillar.id)?.length ?? 0;
            const covered = count > 0;
            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => {
                  setExpandedPillars((current) => ({ ...current, [pillar.id]: true }));
                  document.getElementById(`pillar-${pillar.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  covered
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80 hover:bg-amber-100"
                )}
                title={pillar.label}
              >
                {index + 1}. {pillar.label.split("&")[0]?.trim().slice(0, 14)}
                {covered ? ` · ${count}` : ""}
              </button>
            );
          })}
        </div>
      </section>

      {/* CSV import — collapsible */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setCsvOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Upload className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Bulk import</p>
              <p className="text-xs text-slate-500">CSV with pillar_id, question, help_text, sort_order</p>
            </div>
          </div>
          <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", csvOpen && "rotate-180")} />
        </button>

        {csvOpen && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Paste or load a CSV with{" "}
                <span className="font-mono">
                  pillar_id, question, help_text, sort_order, weight
                </span>
                . Optional <span className="font-mono">weight</span> is 1–10 per question. Prefer
                paste if your browser shows a “digest” error — that comes from a security extension,
                not this app.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                onClick={() => {
                  const blob = new Blob([questionPackCsvTemplate(pillarSet)], {
                    type: "text/csv;charset=utf-8",
                  });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download =
                    pillarSet === "tmt_6"
                      ? "tmt-question-pack-template.csv"
                      : "question-pack-template.csv";
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Download {pillarSet === "tmt_6" ? "TMT" : "standard"} template
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-700">CSV content</p>
                {csvFileName ? (
                  <span className="truncate text-[11px] text-slate-500">Loaded: {csvFileName}</span>
                ) : null}
              </div>
              <textarea
                value={csvText}
                onChange={(event) => {
                  setCsvText(event.target.value);
                  setCsvFileName(null);
                }}
                rows={8}
                placeholder="Paste CSV here (pillar_id, question, help_text, sort_order)…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setCsvDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setCsvDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setCsvDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setCsvDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void loadCsvFileOnly(file);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-5 py-6 text-center transition-colors",
                csvDragOver
                  ? "border-indigo-400 bg-indigo-50/70"
                  : "border-slate-300 bg-slate-50/60"
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
                <Upload className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Or load from a .csv file</p>
                <p className="mt-1 text-xs text-slate-500">
                  Drop a file, or choose one — content is loaded into the box above
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label className="inline-flex cursor-pointer">
                  <span className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    {saving ? "Working…" : "Load file"}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void loadCsvFileOnly(file);
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer">
                  <span className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    Load &amp; append
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void importCsvFileDirect(file, "append");
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer">
                  <span className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-800">
                    Load &amp; replace
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void importCsvFileDirect(file, "replace");
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || !csvText.trim()}
                onClick={() => void importCsv("append")}
                className="rounded-xl"
              >
                Append pasted / loaded CSV
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving || !csvText.trim()}
                onClick={() => void importCsv("replace")}
                className="rounded-xl"
              >
                Replace with pasted / loaded CSV
              </Button>
            </div>

            {csvImportErrors.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-950">
                      {csvImportErrors.length} row{csvImportErrors.length === 1 ? "" : "s"} skipped
                    </p>
                    <p className="mt-0.5 text-xs text-amber-900/80">
                      Valid rows were imported. Fix pillar ids below and re-import, or use the TMT
                      template ids.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-amber-900/70 hover:text-amber-950"
                    onClick={() => setCsvImportErrors([])}
                  >
                    Dismiss
                  </button>
                </div>
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-amber-950">
                  {csvImportErrors.slice(0, 40).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {csvImportErrors.length > 40 ? (
                    <li>…and {csvImportErrors.length - 40} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Pillar weights */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pillar weights</h2>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-500">
              Set how much each pillar influences the overall score (1–10). The bar shows each
              pillar’s share of the total. Question weights inside a pillar are set per question
              below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingWeights || pillarWeights.length === 0}
              onClick={() => void distributePillarWeightsEvenly()}
              className="rounded-xl"
            >
              Distribute evenly
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingWeights || pillarWeights.length === 0}
              onClick={() => void persistPillarWeights(pillarWeights)}
              className="rounded-xl"
            >
              {savingWeights ? "Saving…" : "Save pillar weights"}
            </Button>
          </div>
        </div>
        <div className="px-5 py-5">
          {pillarWeights.length === 0 ? (
            <p className="text-sm text-slate-500">Loading pillar weights…</p>
          ) : (
            <PackPillarWeightMixer
              pillars={pillarWeights}
              disabled={savingWeights}
              onChange={updatePillarWeightLocal}
            />
          )}
        </div>
      </section>

      {/* Pillars */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4 px-1">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Questions by pillar</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Edits save when you leave a field. Assign a weight on each question so critical
              items count more inside the pillar.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => expandAllPillars(true)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => expandAllPillars(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Collapse all
            </button>
          </div>
        </div>

        {packPillars.map((pillar, pillarIndex) => {
          const questions = questionsByPillar.get(pillar.id) ?? [];
          const expanded = isPillarExpanded(pillar.id, questions.length);
          const missing = pack.coverage.missingPillarIds.includes(pillar.id);
          const pillarWeight =
            pillarWeights.find((row) => row.pillarId === pillar.id)?.weight ?? 1;
          const pillarWeightTotal = sumWeights(pillarWeights.map((row) => row.weight));
          const pillarShare = weightSharePct(pillarWeight, pillarWeightTotal);
          const questionWeightTotal = sumWeights(questions.map((question) => question.weight ?? 1));

          return (
            <section
              key={pillar.id}
              id={`pillar-${pillar.id}`}
              className={cn(
                "scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow",
                missing ? "border-amber-200/90" : "border-slate-200/90"
              )}
            >
              <button
                type="button"
                onClick={() => togglePillar(pillar.id)}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
              >
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                    {pillarIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{pillar.label}</h3>
                      {missing ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Needs question
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700">
                          {questions.length} question{questions.length === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                        Weight {pillarWeight} · {pillarShare}% overall
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {pillar.description}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>

              {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                  {questions.length === 0 ? (
                    <p className="mb-4 text-sm text-slate-500">No questions yet for this pillar.</p>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, qIndex) => (
                        <div
                          key={question.id}
                          className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Question {qIndex + 1}
                          </p>
                          <textarea
                            value={drafts[question.id]?.prompt ?? question.prompt}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [question.id]: {
                                  prompt: event.target.value,
                                  helpText: current[question.id]?.helpText ?? question.helpText ?? "",
                                },
                              }))
                            }
                            onBlur={() =>
                              void saveQuestion(question).catch((e) => toast(e.message, { variant: "error" }))
                            }
                            rows={2}
                            className="mt-2 w-full resize-none rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-sm leading-relaxed text-slate-900 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                          />
                          <label className="mt-3 block">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Help text
                              <span className="font-normal normal-case text-slate-400"> — optional</span>
                            </span>
                            <input
                              value={drafts[question.id]?.helpText ?? question.helpText ?? ""}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [question.id]: {
                                    prompt: current[question.id]?.prompt ?? question.prompt,
                                    helpText: event.target.value,
                                  },
                                }))
                              }
                              onBlur={() =>
                                void saveQuestion(question).catch((e) => toast(e.message, { variant: "error" }))
                              }
                              placeholder="Context shown during the assessment"
                              className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                            />
                          </label>
                          <div className="mt-3">
                            <QuestionWeightPicker
                              value={question.weight ?? 1}
                              sharePct={weightSharePct(question.weight ?? 1, questionWeightTotal)}
                              onChange={(weight) =>
                                void saveQuestion(question, weight).catch((e) =>
                                  toast(e.message, { variant: "error" })
                                )
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-rose-600"
                            onClick={() =>
                              void removeQuestion(question.id).catch((e) => toast(e.message, { variant: "error" }))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove question
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 rounded-xl border border-dashed border-slate-200 bg-white/80 p-3">
                    <input
                      value={newPrompt[pillar.id] ?? ""}
                      onChange={(event) =>
                        setNewPrompt((current) => ({ ...current, [pillar.id]: event.target.value }))
                      }
                      placeholder={`Add a question for ${pillar.label.split("&")[0]?.trim()}…`}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void addQuestion(pillar.id).catch((e) => toast(e.message, { variant: "error" }));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => void addQuestion(pillar.id).catch((e) => toast(e.message, { variant: "error" }))}
                      className="shrink-0 rounded-xl"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {orphanQuestions.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
            <p className="text-sm font-semibold text-amber-950">
              Legacy questions outside this pack’s {packPillars.length} pillars
            </p>
            <p className="mt-1 text-xs text-amber-900/80">
              These rows use pillar ids from another taxonomy (often the standard 11). Re-map or
              replace them with the TMT CSV template so coverage and reporting stay aligned.
            </p>
            <ul className="mt-3 space-y-2">
              {orphanQuestions.map((question) => (
                <li
                  key={question.id}
                  className="rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    {question.pillarId}
                  </span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-xs text-slate-500">
                    {packPillarLabel(question.pillarId)}
                  </span>
                  <p className="mt-1 text-sm text-slate-800">{question.prompt}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
