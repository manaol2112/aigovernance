"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  QUESTION_PACK_PRODUCT_META,
  packPillarLabel,
  type QuestionPackProduct,
} from "@/lib/pillar-questionnaire";
import { cn } from "@/lib/utils";

type PackListItem = {
  id: string;
  name: string;
  description: string | null;
  product: QuestionPackProduct;
  questionCount: number;
  coverageComplete: boolean;
  missingPillarIds: string[];
  isDefaultForMaturity: boolean;
  isDefaultForWorkshop: boolean;
  updatedAt: string;
};

type ProductSettings = {
  source: "framework" | "pack";
  defaultPackId: string | null;
};

type CatalogSettings = {
  allowOverride: boolean;
  maturity: ProductSettings;
  workshop: ProductSettings;
};

const PRODUCT_TABS: QuestionPackProduct[] = ["maturity_assessment", "guided_workshop"];

function DefaultPanel({
  product,
  settings,
  packs,
  saving,
  onSave,
}: {
  product: QuestionPackProduct;
  settings: ProductSettings;
  packs: PackListItem[];
  saving: boolean;
  onSave: (next: Partial<ProductSettings>) => void;
}) {
  const meta = QUESTION_PACK_PRODUCT_META[product];
  const productPacks = packs.filter((pack) => pack.product === product);

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
      <h2 className="text-sm font-bold text-[var(--theme-text)]">Default for new {meta.shortLabel.toLowerCase()} sessions</h2>
      <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
        People starting a {meta.label.toLowerCase()} get this catalog automatically — they do not pick a pack.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSave({ source: "framework" })}
          disabled={saving}
          className={cn(
            "rounded-2xl border-2 p-4 text-left transition-all",
            settings.source === "framework"
              ? "border-[var(--theme-brand)] bg-[var(--theme-brand-muted)] shadow-sm"
              : "border-[var(--theme-border)] hover:border-[var(--theme-brand)]/40"
          )}
        >
          <p className="text-sm font-semibold text-[var(--theme-text)]">Framework-aligned</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
            NIST / ISO / EU AI Act controls, 0–5 maturity scale.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onSave({ source: "pack" })}
          disabled={saving}
          className={cn(
            "rounded-2xl border-2 p-4 text-left transition-all",
            settings.source === "pack"
              ? "border-[var(--theme-brand)] bg-[var(--theme-brand-muted)] shadow-sm"
              : "border-[var(--theme-border)] hover:border-[var(--theme-brand)]/40"
          )}
        >
          <p className="text-sm font-semibold text-[var(--theme-text)]">Pillar questionnaire</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
            Custom {meta.shortLabel.toLowerCase()} pack · Yes / No / Partial / Don&apos;t know.
          </p>
        </button>
      </div>

      <label className="mt-5 block text-sm font-medium text-[var(--theme-text)]">
        Active {meta.shortLabel.toLowerCase()} pack
        <select
          className="mt-2 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 py-2.5 text-sm"
          value={settings.defaultPackId ?? ""}
          disabled={saving}
          onChange={(event) => onSave({ defaultPackId: event.target.value || null })}
        >
          <option value="">Select a pack</option>
          {productPacks.map((pack) => (
            <option key={pack.id} value={pack.id} disabled={!pack.coverageComplete}>
              {pack.name}
              {pack.coverageComplete ? "" : " — incomplete"}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

export function AdminQuestionnaires() {
  const [packs, setPacks] = useState<PackListItem[]>([]);
  const [settings, setSettings] = useState<CatalogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProduct, setActiveProduct] = useState<QuestionPackProduct>("maturity_assessment");
  const [newName, setNewName] = useState("");

  async function reload() {
    const [packRes, settingsRes] = await Promise.all([
      fetch("/api/admin/question-packs"),
      fetch("/api/admin/question-catalog-settings"),
    ]);
    const packJson = await packRes.json();
    const settingsJson = await settingsRes.json();
    if (!packRes.ok) throw new Error(packJson.error ?? "Failed to load packs");
    if (!settingsRes.ok) throw new Error(settingsJson.error ?? "Failed to load settings");
    setPacks(packJson.packs);
    setSettings(settingsJson);
  }

  useEffect(() => {
    reload()
      .catch((error) => toast(error instanceof Error ? error.message : "Failed to load.", { variant: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const visiblePacks = useMemo(
    () => packs.filter((pack) => pack.product === activeProduct),
    [packs, activeProduct]
  );

  async function saveSettings(input: {
    allowOverride?: boolean;
    maturity?: Partial<ProductSettings>;
    workshop?: Partial<ProductSettings>;
  }) {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/question-catalog-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowOverride: input.allowOverride ?? settings.allowOverride,
          maturitySource: input.maturity?.source ?? settings.maturity.source,
          maturityDefaultPackId:
            input.maturity?.defaultPackId !== undefined
              ? input.maturity.defaultPackId
              : settings.maturity.defaultPackId,
          workshopSource: input.workshop?.source ?? settings.workshop.source,
          workshopDefaultPackId:
            input.workshop?.defaultPackId !== undefined
              ? input.workshop.defaultPackId
              : settings.workshop.defaultPackId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      setSettings(data);
      toast("Questionnaire defaults saved.", { variant: "success" });
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save settings.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function createPack() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/question-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, product: activeProduct }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create pack");
      setNewName("");
      toast("Pack created. Add questions for each pillar.", { variant: "success" });
      window.location.href = `/admin/question-packs/${data.id}`;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create pack.", { variant: "error" });
      setSaving(false);
    }
  }

  async function duplicatePack(id: string) {
    const res = await fetch(`/api/admin/question-packs/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not duplicate");
    toast("Pack duplicated.", { variant: "success" });
    await reload();
  }

  async function archivePack(id: string) {
    const res = await fetch(`/api/admin/question-packs/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not archive");
    toast("Pack archived.", { variant: "success" });
    await reload();
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--theme-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading questionnaires…
      </div>
    );
  }

  const productMeta = QUESTION_PACK_PRODUCT_META[activeProduct];
  const productSettings =
    activeProduct === "guided_workshop" ? settings.workshop : settings.maturity;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--theme-text)]">
          Pillar questionnaires
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--theme-text-muted)]">
          Maintain separate question packs for maturity assessment and guided workshop. Each pack
          is tagged to one product only. Framework-aligned mode stays available for both.
        </p>
      </div>

      <div className="inline-flex rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-1.5 shadow-sm">
        {PRODUCT_TABS.map((product) => (
          <button
            key={product}
            type="button"
            onClick={() => setActiveProduct(product)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              activeProduct === product
                ? "bg-slate-900 text-white"
                : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
            )}
          >
            {QUESTION_PACK_PRODUCT_META[product].label}
          </button>
        ))}
      </div>

      <DefaultPanel
        product={activeProduct}
        settings={productSettings}
        packs={packs}
        saving={saving}
        onSave={(next) =>
          void saveSettings({
            [activeProduct === "guided_workshop" ? "workshop" : "maturity"]: {
              ...productSettings,
              ...next,
            },
          })
        }
      />

      <label className="flex items-start gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-4 text-sm text-[var(--theme-text)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={settings.allowOverride}
          disabled={saving}
          onChange={(event) => void saveSettings({ allowOverride: event.target.checked })}
        />
        <span>
          Allow a practitioner to switch catalog for a single run (framework vs questionnaire).
          Applies to both products. Leave off for client-facing sessions.
        </span>
      </label>

      <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--theme-text)]">
              {productMeta.label} packs
            </h2>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
              Only packs tagged for {productMeta.label.toLowerCase()} appear here.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={`New ${productMeta.shortLabel.toLowerCase()} pack`}
              className="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-sm"
            />
            <Button type="button" onClick={() => void createPack()} disabled={saving || !newName.trim()}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {visiblePacks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--theme-border)] px-4 py-8 text-center text-sm text-[var(--theme-text-muted)]">
              No {productMeta.shortLabel.toLowerCase()} packs yet. Create one, then upload a CSV or add questions by pillar.
            </p>
          ) : (
            visiblePacks.map((pack) => {
              const isDefault =
                activeProduct === "guided_workshop"
                  ? pack.isDefaultForWorkshop
                  : pack.isDefaultForMaturity;
              return (
                <div
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/question-packs/${pack.id}`}
                        className="font-semibold text-[var(--theme-text)] hover:underline"
                      >
                        {pack.name}
                      </Link>
                      {isDefault && (
                        <span className="rounded-full bg-[var(--theme-brand-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-brand)]">
                          Default
                        </span>
                      )}
                      {pack.coverageComplete ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> 11 pillars
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Missing {pack.missingPillarIds.slice(0, 3).map(packPillarLabel).join(", ")}
                          {pack.missingPillarIds.length > 3 ? "…" : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                      {pack.questionCount} active question{pack.questionCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/question-packs/${pack.id}`}>Edit</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void duplicatePack(pack.id).catch((e) => toast(e.message, { variant: "error" }))}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void archivePack(pack.id).catch((e) => toast(e.message, { variant: "error" }))}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
