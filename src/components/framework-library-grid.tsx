import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  GitCompareArrows,
  Link2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFrameworkLibraryMeta,
  getFrameworkScope,
  getFrameworkShortLabel,
} from "@/lib/framework-library";
import { cn } from "@/lib/utils";

export type FrameworkLibraryItem = {
  id: string;
  code: string;
  name: string;
  version: string;
  publisher: string;
  sourceUrl: string;
  requirementCount: number;
  controlLinks: number;
  crosswalkLinks: number;
};

type Props = {
  frameworks: FrameworkLibraryItem[];
};

export function FrameworkLibraryGrid({ frameworks }: Props) {
  return (
    <div className="space-y-5">
      {frameworks.map((framework, index) => {
        const meta = getFrameworkLibraryMeta(framework.code);
        const scope = getFrameworkScope(framework.code);
        const shortLabel = getFrameworkShortLabel(framework.code);

        return (
          <article
            key={framework.id}
            className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <span
                  className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", meta.accentDot)}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Framework {index + 1}
                    </p>
                    <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                      {framework.code}
                    </code>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {framework.name}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{meta.tagline}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {framework.publisher} · Version {framework.version}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {meta.focus.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Ingested scope
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {scope?.scopeNote ??
                    "Source-verified requirements with clause IDs and provenance citations."}
                </p>

                {scope?.textNote && (
                  <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/50 px-3.5 py-3 text-xs leading-relaxed text-amber-950">
                    {scope.textNote}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatChip label="Requirements" value={framework.requirementCount} />
                <StatChip label="Control links" value={framework.controlLinks} />
                <StatChip label="Crosswalk links" value={framework.crosswalkLinks} />
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap">
                <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Link href={`/frameworks/${framework.code}`}>
                    <BookOpen className="h-4 w-4" />
                    Browse {shortLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2 bg-white">
                  <Link href="/crosswalk">
                    <GitCompareArrows className="h-4 w-4" />
                    View crosswalk
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="gap-2 text-slate-600">
                  <a href={framework.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Official source
                  </a>
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export function FrameworkLibraryHighlights({
  frameworkCount,
  requirementCount,
  controlLinks,
  crosswalkLinks,
}: {
  frameworkCount: number;
  requirementCount: number;
  controlLinks: number;
  crosswalkLinks: number;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">How this library is used</p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
              Requirements are the source of truth for assessments. Each clause is traceable to official
              publications, cross-mapped across frameworks, and linked to canonical control workplans.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
        <HighlightItem
          icon={BookOpen}
          title="Framework requirements"
          value={requirementCount}
          hint={`${frameworkCount} standards ingested`}
        />
        <HighlightItem
          icon={Link2}
          title="Control mappings"
          value={controlLinks}
          hint="Requirement-to-control links"
        />
        <HighlightItem
          icon={GitCompareArrows}
          title="Crosswalk edges"
          value={crosswalkLinks}
          hint="Inter-framework equivalencies"
        />
        <HighlightItem
          icon={Shield}
          title="Avg. per framework"
          value={frameworkCount > 0 ? Math.round(requirementCount / frameworkCount) : 0}
          hint="Requirements ingested per standard"
        />
      </div>
    </section>
  );
}

function HighlightItem({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  title: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{title}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
