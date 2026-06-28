import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { titleCase } from "@/lib/utils";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";
import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";

export const dynamic = "force-dynamic";

export default async function FrameworkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { code } = await params;
  const { type } = await searchParams;

  const framework = await prisma.framework.findUnique({
    where: { code },
  });
  if (!framework) notFound();

  const requirements = await prisma.frameworkRequirement.findMany({
    where: {
      frameworkId: framework.id,
      ...(type ? { requirementType: type as never } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { clauseId: "asc" }],
    include: {
      _count: { select: { crosswalkFrom: true, crosswalkTo: true, controlLinks: true } },
    },
  });

  const types = [...new Set(requirements.map((r) => r.requirementType))];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/frameworks">
              <ArrowLeft className="mr-1 h-4 w-4" /> Frameworks
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{framework.name}</h1>
          <p className="mt-1 text-slate-500">
            {framework.publisher} · v{framework.version} · {requirements.length} requirements
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={framework.sourceUrl} target="_blank" rel="noopener noreferrer">
            Source <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>

      {FRAMEWORK_SCOPE[code] && (
        <FrameworkScopeNotice codes={[code]} compact />
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/frameworks/${code}`}>
          <Badge variant={!type ? "default" : "outline"}>All</Badge>
        </Link>
        {types.map((t) => (
          <Link key={t} href={`/frameworks/${code}?type=${t}`}>
            <Badge variant={type === t ? "default" : "outline"}>{titleCase(t)}</Badge>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {requirements.map((req) => (
          <Card key={req.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                  {req.clauseId}
                </code>
                <StatusBadge status={req.verificationStatus} />
                <Badge variant="outline">{titleCase(req.requirementType)}</Badge>
                {req.riskTier && <Badge variant="warning">{titleCase(req.riskTier)}</Badge>}
                {req.actor && <Badge variant="secondary">{titleCase(req.actor)}</Badge>}
              </div>
              <CardTitle className="text-base">{req.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-700">{req.requirementText}</p>
              <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>Source: {req.sourcePage ?? req.sourceDocument}</span>
                <span>Mappings out: {req._count.crosswalkFrom}</span>
                <span>Mappings in: {req._count.crosswalkTo}</span>
                <span>Controls: {req._count.controlLinks}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
