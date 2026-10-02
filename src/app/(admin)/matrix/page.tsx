import Link from "next/link";
import { buildRiskControlMatrix, getMatrixSummary } from "@/lib/risk-control-matrix";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
import { RiskControlMatrixTable, MatrixHeatmapLegend } from "@/components/risk-control-matrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers3, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RiskControlMatrixPage() {
  const [matrix, summary] = await Promise.all([
    buildRiskControlMatrix(),
    getMatrixSummary(),
  ]);

  const sortedMatrix = [...matrix].sort((a, b) => {
    if (b.crossFrameworkScore !== a.crossFrameworkScore) {
      return b.crossFrameworkScore - a.crossFrameworkScore;
    }
    return b.totalRequirements - a.totalRequirements;
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        variant="hero"
        eyebrow="Coverage matrix"
        title="Risk & control matrix"
        description="Critical risk pillars mapped across NIST AI RMF, ISO 42001, EU AI Act, OECD AI Principles, and COSO ERM — with deduplicated canonical controls for each pillar."
        actions={
          <>
            <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/risk-taxonomy">Risk taxonomy</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/crosswalk">Open crosswalk</Link>
            </Button>
          </>
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminPageHeaderStat icon={Layers3} label="Risk pillars" value={summary.pillarCount} />
          <AdminPageHeaderStat icon={ShieldAlert} label="Critical pillars" value={summary.criticalPillars} />
          <AdminPageHeaderStat icon={ShieldCheck} label="4+ framework coverage" value={summary.fullyCrossed} />
          <AdminPageHeaderStat icon={Shield} label="Canonical controls" value={summary.totalControls} />
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Framework legend</CardTitle>
          <CardDescription>
            Each column shows how many framework requirements map to the pillar via crosswalk-linked
            controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatrixHeatmapLegend />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cross-framework matrix</h2>
            <p className="mt-1 text-sm text-slate-600">
              Sorted by cross-framework coverage — higher scores mean stronger alignment.
            </p>
          </div>
          <Badge variant="success" className="ml-auto">
            Sorted by coverage
          </Badge>
        </div>
        <RiskControlMatrixTable rows={sortedMatrix} />
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">How to read this matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            <strong>Rows</strong> are critical risk pillars derived from the canonical risk taxonomy
            (governance, fairness, privacy, safety, security, transparency, oversight, compliance,
            supply chain, systemic/GPAI).
          </p>
          <p>
            <strong>Columns</strong> show framework requirement coverage per pillar — requirements
            linked through deduplicated canonical controls, not duplicated per framework.
          </p>
          <p>
            <strong>Controls</strong> are the unified mitigation layer. One control may satisfy
            obligations across multiple frameworks simultaneously.
          </p>
          <p>
            <strong>Cross-framework score</strong> indicates how many of the five frameworks have at
            least one mapped requirement for that pillar — higher scores mean stronger crosswalk
            alignment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
