import { prisma } from "@/lib/db";
import { RiskTaxonomyExplorer } from "@/components/risk-taxonomy-explorer";
import { buildRiskTaxonomy } from "@/lib/risk-taxonomy";
import { Layers3, ShieldAlert, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RiskTaxonomyPage() {
  const risks = await prisma.riskStatement.findMany({
    include: {
      controlLinks: {
        include: {
          control: {
            select: { code: true, title: true },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const riskTaxonomy = buildRiskTaxonomy(risks);
  const { summary } = riskTaxonomy;

  const coveragePct =
    summary.totalRisks > 0 ? Math.round((summary.mitigatedRisks / summary.totalRisks) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200/80">
          Canonical risk library
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Risk taxonomy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          The authoritative catalog of AI risk statements that anchor control workplans, workshop
          facilitation, and cross-framework coverage analysis. Browse by pillar, review potential harms,
          and trace each risk to its mitigating controls.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <HeroStat icon={ShieldAlert} label="Risk statements" value={summary.totalRisks} />
          <HeroStat icon={Layers3} label="Risk pillars" value={summary.pillarCount} />
          <HeroStat icon={ShieldCheck} label="Mitigation coverage" value={`${coveragePct}%`} />
        </div>
      </div>

      <RiskTaxonomyExplorer groups={riskTaxonomy.groups} summary={riskTaxonomy.summary} />
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-slate-300">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
