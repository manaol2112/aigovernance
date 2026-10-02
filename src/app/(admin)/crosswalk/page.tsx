import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, ConfidenceBadge, MappingTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { CheckCircle2, GitCompareArrows, Link2, TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CrosswalkPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; confidence?: string }>;
}) {
  const { filter, confidence } = await searchParams;

  const unmappedNist =
    filter === "unmapped"
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
    <div className="space-y-8">
      <AdminPageHeader
        variant="hero"
        eyebrow="Alignment console"
        title="Crosswalk review"
        description="NIST-anchored mappings to ISO 42001, EU AI Act, OECD, and COSO ERM with reviewer audit trail — every link traceable for assurance workpapers."
        actions={
          <>
            <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/frameworks">Framework library</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/matrix">Risk matrix</Link>
            </Button>
          </>
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminPageHeaderStat icon={GitCompareArrows} label="Total mappings" value={stats[0]} />
          <AdminPageHeaderStat icon={Link2} label="High confidence" value={stats[1]} />
          <AdminPageHeaderStat icon={CheckCircle2} label="Peer reviewed" value={stats[2]} />
          <AdminPageHeaderStat icon={TriangleAlert} label="Unmapped NIST" value={stats[3]} />
        </div>
      </AdminPageHeader>

      <FrameworkScopeNotice compact />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Mapping catalog</h2>
          <p className="mt-1 text-sm text-slate-600">
            Filter the review queue, then open any mapping to validate confidence and rationale.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant={!filter && !confidence ? "default" : "outline"} size="sm">
            <Link href="/crosswalk">All mappings</Link>
          </Button>
          <Button asChild variant={filter === "unmapped" ? "default" : "outline"} size="sm">
            <Link href="/crosswalk?filter=unmapped">Unmapped NIST</Link>
          </Button>
          <Button asChild variant={confidence === "high" ? "default" : "outline"} size="sm">
            <Link href="/crosswalk?confidence=high">High confidence</Link>
          </Button>
          <Button asChild variant={confidence === "medium" ? "default" : "outline"} size="sm">
            <Link href="/crosswalk?confidence=medium">Medium confidence</Link>
          </Button>
        </div>

        {filter === "unmapped" && unmappedNist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unmapped NIST subcategories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unmappedNist.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-4 py-3"
                >
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
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <MappingTypeBadge type={m.mappingType} />
                  <ConfidenceBadge confidence={m.confidence} />
                  <StatusBadge status={m.verificationStatus} />
                  {m.verifiedBy && (
                    <Badge variant="secondary">Verified by {m.verifiedBy}</Badge>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      {m.sourceRequirement.framework.code}
                    </div>
                    <code className="text-sm font-mono">{m.sourceRequirement.clauseId}</code>
                    <div className="mt-1 text-sm font-medium">{m.sourceRequirement.title}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase text-slate-500">
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
    </div>
  );
}
