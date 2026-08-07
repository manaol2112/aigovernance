import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { titleCase } from "@/lib/utils";
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
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200/80">
          Canonical control library
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Control workplans</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Enterprise-grade assessment workplans for every canonical control — test procedures, required
          evidence, and workshop facilitation questions mapped to framework obligations.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <HeroStat icon={ListChecks} label="Controls cataloged" value={controls.length} />
          <HeroStat icon={FileCheck} label="Evidence definitions" value={controls.reduce((n, c) => n + c._count.evidences, 0)} />
          <HeroStat icon={HelpCircle} label="Framework links" value={controls.reduce((n, c) => n + c._count.requirementLinks, 0)} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{controls.length} control workplans</h2>
            <p className="mt-1 text-sm text-slate-500">
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

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-slate-300">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
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
