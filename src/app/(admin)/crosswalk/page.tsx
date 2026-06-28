import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, ConfidenceBadge, MappingTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";

export const dynamic = "force-dynamic";

export default async function CrosswalkPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; confidence?: string }>;
}) {
  const { filter, confidence } = await searchParams;

  const unmappedNist = filter === "unmapped"
    ? await prisma.frameworkRequirement.findMany({
        where: {
          framework: { code: "NIST-AI-RMF" },
          requirementType: "subcategory",
          crosswalkFrom: { none: {} },
        },
        include: { framework: true },
        orderBy: { clauseId: "asc" },
      })
    : [];

  const mappings = await prisma.crosswalkMapping.findMany({
    where: {
      ...(confidence ? { confidence: confidence as never } : {}),
    },
    include: {
      sourceRequirement: { include: { framework: true } },
      targetRequirement: { include: { framework: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filter === "unmapped" ? 0 : 100,
  });

  const stats = await prisma.$transaction([
    prisma.crosswalkMapping.count(),
    prisma.crosswalkMapping.count({ where: { confidence: "high" } }),
    prisma.crosswalkMapping.count({ where: { verificationStatus: "peer_reviewed" } }),
    prisma.frameworkRequirement.count({
      where: {
        framework: { code: "NIST-AI-RMF" },
        requirementType: "subcategory",
        crosswalkFrom: { none: {} },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crosswalk Review Console</h1>
        <p className="mt-2 text-slate-500">
          NIST-anchored mappings to ISO 42001, EU AI Act, OECD, and COSO ERM with reviewer audit trail.
        </p>
      </div>

      <FrameworkScopeNotice compact />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Mappings</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats[0]}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">High Confidence</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats[1]}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Peer Reviewed</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats[2]}</div></CardContent>
        </Card>
        <Card className={stats[3] > 0 ? "border-amber-200" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Unmapped NIST</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats[3]}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={!filter && !confidence ? "default" : "outline"} size="sm">
          <Link href="/crosswalk">All Mappings</Link>
        </Button>
        <Button asChild variant={filter === "unmapped" ? "default" : "outline"} size="sm">
          <Link href="/crosswalk?filter=unmapped">Unmapped NIST</Link>
        </Button>
        <Button asChild variant={confidence === "high" ? "default" : "outline"} size="sm">
          <Link href="/crosswalk?confidence=high">High Confidence</Link>
        </Button>
        <Button asChild variant={confidence === "medium" ? "default" : "outline"} size="sm">
          <Link href="/crosswalk?confidence=medium">Medium Confidence</Link>
        </Button>
      </div>

      {filter === "unmapped" && unmappedNist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmapped NIST Subcategories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unmappedNist.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <div>
                  <code className="text-xs font-mono">{req.clauseId}</code>
                  <div className="text-sm font-medium">{req.title}</div>
                </div>
                <StatusBadge status={req.verificationStatus} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {mappings.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <MappingTypeBadge type={m.mappingType} />
                <ConfidenceBadge confidence={m.confidence} />
                <StatusBadge status={m.verificationStatus} />
                {m.verifiedBy && (
                  <Badge variant="secondary">Verified by {m.verifiedBy}</Badge>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    {m.sourceRequirement.framework.code}
                  </div>
                  <code className="text-sm font-mono">{m.sourceRequirement.clauseId}</code>
                  <div className="mt-1 text-sm font-medium">{m.sourceRequirement.title}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    {m.targetRequirement.framework.code}
                  </div>
                  <code className="text-sm font-mono">{m.targetRequirement.clauseId}</code>
                  <div className="mt-1 text-sm font-medium">{m.targetRequirement.title}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{m.rationale}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
