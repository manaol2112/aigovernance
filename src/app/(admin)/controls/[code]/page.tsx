import { Suspense } from "react";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ControlWorkplanPanel } from "@/components/control-workplan-panel";
import { getControlWorkplan } from "@/lib/control-workplan";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ControlDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const workplan = await getControlWorkplan(code);

  if (!workplan) notFound();

  const risks = await prisma.controlRiskLink.findMany({
    where: { controlId: workplan.control.id },
    include: { risk: true },
    orderBy: { risk: { code: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/controls">
            <ArrowLeft className="mr-1 h-4 w-4" /> Control library
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-slate-100 px-2 py-1 text-sm font-mono">{workplan.control.code}</code>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            Loading workplan…
          </div>
        }
      >
        <ControlWorkplanPanel workplan={workplan} />
      </Suspense>

      {risks.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">Linked risk statements</p>
            <p className="mt-1 text-xs text-slate-500">
              Risks this control is designed to mitigate during assessment execution.
            </p>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {risks.map((link) => (
              <div key={link.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <code className="text-xs font-mono text-slate-500">{link.risk.code}</code>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{link.risk.statement}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
