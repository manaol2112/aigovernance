import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  FrameworkLibraryGrid,
  FrameworkLibraryHighlights,
  type FrameworkLibraryItem,
} from "@/components/framework-library-grid";
import { BookOpen, GitCompareArrows, Layers3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function FrameworksPage() {
  const frameworks = await prisma.framework.findMany({
    include: {
      _count: { select: { requirements: true } },
      requirements: {
        select: {
          _count: {
            select: {
              controlLinks: true,
              crosswalkFrom: true,
              crosswalkTo: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const items: FrameworkLibraryItem[] = frameworks.map((framework) => ({
    id: framework.id,
    code: framework.code,
    name: framework.name,
    version: framework.version,
    publisher: framework.publisher,
    sourceUrl: framework.sourceUrl,
    requirementCount: framework._count.requirements,
    controlLinks: framework.requirements.reduce((sum, req) => sum + req._count.controlLinks, 0),
    crosswalkLinks: framework.requirements.reduce(
      (sum, req) => sum + req._count.crosswalkFrom + req._count.crosswalkTo,
      0
    ),
  }));

  const requirementCount = items.reduce((sum, item) => sum + item.requirementCount, 0);
  const controlLinks = items.reduce((sum, item) => sum + item.controlLinks, 0);
  const crosswalkLinks = items.reduce((sum, item) => sum + item.crosswalkLinks, 0);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-200/80">
          Source-verified library
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Framework library</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Browse the canonical requirement catalog powering assessments, crosswalk alignment, and control
          workplans — each clause traced to official publications with provenance metadata.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HeroStat icon={Layers3} label="Frameworks" value={items.length} />
          <HeroStat icon={BookOpen} label="Requirements" value={requirementCount} />
          <HeroStat icon={Shield} label="Control mappings" value={controlLinks} />
          <HeroStat icon={GitCompareArrows} label="Crosswalk links" value={crosswalkLinks} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
            <Link href="/crosswalk">Open crosswalk console</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <Link href="/matrix">View risk matrix</Link>
          </Button>
        </div>
      </div>

      <FrameworkLibraryHighlights
        frameworkCount={items.length}
        requirementCount={requirementCount}
        controlLinks={controlLinks}
        crosswalkLinks={crosswalkLinks}
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Standards catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
            Open any framework to review clause-level requirements, provenance, and control coverage.
          </p>
        </div>

        <FrameworkLibraryGrid frameworks={items} />
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
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
