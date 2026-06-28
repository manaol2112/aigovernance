import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GitCompareArrows, Shield, AlertTriangle, ArrowRight, Grid3x3 } from "lucide-react";
import { getMatrixSummary } from "@/lib/risk-control-matrix";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    frameworkCount,
    requirementCount,
    crosswalkCount,
    controlCount,
    riskCount,
    unmappedNist,
    assessmentCount,
  ] = await Promise.all([
    prisma.framework.count(),
    prisma.frameworkRequirement.count(),
    prisma.crosswalkMapping.count(),
    prisma.canonicalControl.count(),
    prisma.riskStatement.count(),
    prisma.frameworkRequirement.count({
      where: {
        framework: { code: "NIST-AI-RMF" },
        requirementType: "subcategory",
        crosswalkFrom: { none: {} },
      },
    }),
    prisma.assessment.count(),
  ]);
  return { frameworkCount, requirementCount, crosswalkCount, controlCount, riskCount, unmappedNist, assessmentCount };
}

export default async function DashboardPage() {
  const stats = await getStats();
  const matrixSummary = await getMatrixSummary();
  const frameworks = await prisma.framework.findMany({ orderBy: { name: "asc" } });

  const cards = [
    { label: "Frameworks", value: stats.frameworkCount, icon: BookOpen, href: "/frameworks" },
    { label: "Requirements", value: stats.requirementCount, icon: BookOpen, href: "/frameworks" },
    { label: "Crosswalk Mappings", value: stats.crosswalkCount, icon: GitCompareArrows, href: "/crosswalk" },
    { label: "Canonical Controls", value: stats.controlCount, icon: Shield, href: "/controls" },
    { label: "Risk Statements", value: stats.riskCount, icon: AlertTriangle, href: "/controls" },
    { label: "Assessments", value: stats.assessmentCount, icon: Shield, href: "/assessments" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Governance Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Source-verified crosswalk across NIST AI RMF, ISO 42001, EU AI Act, OECD, and COSO ERM.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription>{card.label}</CardDescription>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {stats.unmappedNist > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              Unmapped NIST Subcategories
            </CardTitle>
            <CardDescription className="text-amber-700">
              {stats.unmappedNist} NIST subcategories have no outbound crosswalk mappings yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/crosswalk?filter=unmapped">
                Review Crosswalk <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Risk & Control Matrix
          </CardTitle>
          <CardDescription className="text-slate-300">
            {matrixSummary.pillarCount} critical risk pillars · {matrixSummary.fullyCrossed} with
            4+ framework crosswalk coverage · {matrixSummary.totalControls} canonical controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link href="/matrix">
              View Matrix <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Framework Corpus</CardTitle>
          <CardDescription>Authoritative sources ingested with provenance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {frameworks.map((fw) => (
              <Link
                key={fw.id}
                href={`/frameworks/${fw.code}`}
                className="flex items-center justify-between py-4 transition-colors hover:bg-slate-50 -mx-2 px-2 rounded-lg"
              >
                <div>
                  <div className="font-medium text-slate-900">{fw.name}</div>
                  <div className="text-sm text-slate-500">
                    {fw.publisher} · v{fw.version}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
