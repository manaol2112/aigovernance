import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ControlDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const control = await prisma.canonicalControl.findUnique({
    where: { code },
    include: {
      evidences: true,
      procedures: true,
      requirementLinks: {
        include: { requirement: { include: { framework: true } } },
      },
      riskLinks: { include: { risk: true } },
    },
  });

  if (!control) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/controls">
            <ArrowLeft className="mr-1 h-4 w-4" /> Controls
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-slate-100 px-2 py-1 text-sm font-mono">{control.code}</code>
          <StatusBadge status={control.verificationStatus} />
          <Badge variant="outline">{titleCase(control.controlType)}</Badge>
          <Badge variant="secondary">{titleCase(control.frequency)}</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{control.title}</h1>
        <p className="mt-2 text-slate-600">{control.description}</p>
        <p className="mt-1 text-sm text-slate-500">Owner: {control.ownerRole}</p>
        {control.cosoIcfComponent && (
          <p className="mt-1 text-sm text-slate-500">
            COSO ICF: {control.cosoIcfComponent} — {control.cosoIcfPrinciple}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Linked Requirements ({control.requirementLinks.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {control.requirementLinks.map((link) => (
              <div key={link.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{link.requirement.framework.code}</Badge>
                  <Badge variant="outline">{titleCase(link.coverage)}</Badge>
                </div>
                <code className="mt-1 block text-xs font-mono">{link.requirement.clauseId}</code>
                <div className="text-sm font-medium">{link.requirement.title}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Linked Risks ({control.riskLinks.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {control.riskLinks.map((link) => (
              <div key={link.id} className="rounded-lg border border-slate-200 p-3">
                <code className="text-xs font-mono text-slate-500">{link.risk.code}</code>
                <Badge variant="outline" className="ml-2">{titleCase(link.risk.category)}</Badge>
                <p className="mt-1 text-sm">{link.risk.statement}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Evidence Requirements ({control.evidences.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {control.evidences.map((ev) => (
            <div key={ev.id} className="rounded-lg bg-slate-50 p-4">
              <div className="font-medium">{ev.evidenceType}</div>
              <p className="mt-1 text-sm text-slate-600">{ev.description}</p>
              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <span>Retention: {ev.retentionPeriod}</span>
                <span>Collection: {ev.collectionMethod}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Procedures ({control.procedures.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {control.procedures.map((proc) => (
            <div key={proc.id} className="rounded-lg bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Responsible: {proc.responsibleRole}</div>
              {proc.linkedPolicy && (
                <div className="text-sm text-slate-500">Policy: {proc.linkedPolicy}</div>
              )}
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{proc.steps}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
