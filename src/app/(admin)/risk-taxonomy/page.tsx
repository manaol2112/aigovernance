import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
import { Button } from "@/components/ui/button";
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
      <AdminPageHeader
        variant="hero"
        eyebrow="Canonical risk library"
        title="Risk taxonomy"
        description="The authoritative catalog of AI risk statements that anchor control workplans, workshop facilitation, and cross-framework coverage analysis. Browse by pillar, review potential harms, and trace each risk to its mitigating controls."
        actions={
          <>
            <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/matrix">Risk matrix</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/controls">Control workplans</Link>
            </Button>
          </>
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <AdminPageHeaderStat icon={ShieldAlert} label="Risk statements" value={summary.totalRisks} />
          <AdminPageHeaderStat icon={Layers3} label="Risk pillars" value={summary.pillarCount} />
          <AdminPageHeaderStat icon={ShieldCheck} label="Mitigation coverage" value={`${coveragePct}%`} />
        </div>
      </AdminPageHeader>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Risk catalog</h2>
          <p className="mt-1 text-sm text-slate-600">
            Explore statements by pillar and follow each risk to its mitigating controls.
          </p>
        </div>
        <RiskTaxonomyExplorer groups={riskTaxonomy.groups} summary={riskTaxonomy.summary} />
      </div>
    </div>
  );
}
