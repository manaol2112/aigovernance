import { buildRiskControlMatrix, getMatrixSummary } from "@/lib/risk-control-matrix";
import { RiskControlMatrixTable, MatrixHeatmapLegend } from "@/components/risk-control-matrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Risk & Control Matrix
        </h1>
        <p className="mt-2 max-w-3xl text-slate-500">
          Critical risk pillars mapped across NIST AI RMF, ISO 42001, EU AI Act, OECD AI Principles,
          and COSO ERM — with deduplicated canonical controls for each pillar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk Pillars</CardDescription>
            <CardTitle className="text-3xl">{summary.pillarCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical Pillars</CardDescription>
            <CardTitle className="text-3xl">{summary.criticalPillars}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>4+ Framework Coverage</CardDescription>
            <CardTitle className="text-3xl">{summary.fullyCrossed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Canonical Controls</CardDescription>
            <CardTitle className="text-3xl">{summary.totalControls}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Framework Legend</CardTitle>
          <CardDescription>
            Each column shows how many framework requirements map to the pillar via crosswalk-linked controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatrixHeatmapLegend />
        </CardContent>
      </Card>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Cross-Framework Matrix</h2>
          <Badge variant="success">Sorted by cross-framework coverage</Badge>
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
            <strong>Cross-framework score</strong> indicates how many of the five frameworks have
            at least one mapped requirement for that pillar — higher scores mean stronger crosswalk alignment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
