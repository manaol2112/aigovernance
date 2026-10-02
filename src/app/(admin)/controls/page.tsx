import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { titleCase } from "@/lib/utils";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
import { ArrowRight, ClipboardCheck, FileCheck, HelpCircle, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ControlsPage() {
  const controls = await prisma.canonicalControl.findMany({
    include: {
      _count: { select: { requirementLinks: true, evidences: true, procedures: true, riskLinks: true } },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        variant="hero"
        eyebrow="Canonical control library"
        title="Control workplans"
        description="Enterprise-grade assessment workplans for every canonical control — test procedures, required evidence, and workshop facilitation questions mapped to framework obligations."
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
              <Link href="/risk-taxonomy">Risk taxonomy</Link>
            </Button>
          </>
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <AdminPageHeaderStat icon={ListChecks} label="Controls cataloged" value={controls.length} />
          <AdminPageHeaderStat
            icon={FileCheck}
            label="Evidence definitions"
            value={controls.reduce((n, c) => n + c._count.evidences, 0)}
          />
          <AdminPageHeaderStat
            icon={HelpCircle}
            label="Framework links"
            value={controls.reduce((n, c) => n + c._count.requirementLinks, 0)}
          />
        </div>
      </AdminPageHeader>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {controls.length} control workplans
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Open any control to review its assessment execution plan.
            </p>
          </div>
        </div>

        {controls.map((ctrl) => {
          const readiness = [
            ctrl._count.requirementLinks > 0,
            ctrl._count.evidences > 0,
          ].filter(Boolean).length;

          return (
            <Link key={ctrl.id} href={`/controls/${ctrl.code}`}>
              <Card className="transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/40">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono">{ctrl.code}</code>
                    <StatusBadge status={ctrl.verificationStatus} />
                    <Badge variant="outline">{titleCase(ctrl.controlType)}</Badge>
                    <Badge variant="secondary">{titleCase(ctrl.frequency)}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        readiness === 2
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }
                    >
                      Workplan {readiness}/2
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{ctrl.title}</CardTitle>
                  <CardDescription>{ctrl.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <WorkplanChip icon={HelpCircle} label="Framework reqs" value={ctrl._count.requirementLinks} />
                    <WorkplanChip icon={FileCheck} label="Evidence" value={ctrl._count.evidences} />
                    <WorkplanChip icon={ClipboardCheck} label="Risks" value={ctrl._count.riskLinks} />
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-indigo-700">
                    Open workplan <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WorkplanChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
