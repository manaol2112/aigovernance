import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { titleCase } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ControlsPage() {
  const [controls, risks] = await Promise.all([
    prisma.canonicalControl.findMany({
      include: {
        _count: { select: { requirementLinks: true, evidences: true, procedures: true, riskLinks: true } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.riskStatement.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Canonical Control Library</h1>
        <p className="mt-2 text-slate-500">
          Deduplicated controls mapped to framework requirements, risks, evidence, and procedures.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Statement Taxonomy</CardTitle>
          <CardDescription>{risks.length} canonical AI risk statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {risks.map((risk) => (
              <div key={risk.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-slate-500">{risk.code}</code>
                  <Badge variant="outline">{titleCase(risk.category)}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-700 line-clamp-2">{risk.statement}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{controls.length} Canonical Controls</h2>
        {controls.map((ctrl) => (
          <Link key={ctrl.id} href={`/controls/${ctrl.code}`}>
            <Card className="transition-all hover:border-slate-300 hover:shadow-md">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono">{ctrl.code}</code>
                  <StatusBadge status={ctrl.verificationStatus} />
                  <Badge variant="outline">{titleCase(ctrl.controlType)}</Badge>
                  <Badge variant="secondary">{titleCase(ctrl.frequency)}</Badge>
                </div>
                <CardTitle className="text-lg">{ctrl.title}</CardTitle>
                <CardDescription>{ctrl.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>{ctrl._count.requirementLinks} requirements</span>
                  <span>{ctrl._count.riskLinks} risks</span>
                  <span>{ctrl._count.evidences} evidence items</span>
                  <span>{ctrl._count.procedures} procedures</span>
                  {ctrl.cosoIcfComponent && <span>COSO ICF: {ctrl.cosoIcfComponent}</span>}
                </div>
                <div className="mt-3 flex items-center text-sm font-medium text-slate-600">
                  View details <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
