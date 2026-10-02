import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  FrameworkLibraryGrid,
  FrameworkLibraryHighlights,
  type FrameworkLibraryItem,
} from "@/components/framework-library-grid";
import { BookOpen, GitCompareArrows, Layers3, Shield } from "lucide-react";
import { AdminPageHeader, AdminPageHeaderStat } from "@/components/admin-page-header";
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
      <AdminPageHeader
        variant="hero"
        eyebrow="Source-verified library"
        title="Framework library"
        description="Browse the canonical requirement catalog powering assessments, crosswalk alignment, and control workplans — each clause traced to official publications with provenance metadata."
        actions={
          <>
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
          </>
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminPageHeaderStat icon={Layers3} label="Frameworks" value={items.length} />
          <AdminPageHeaderStat icon={BookOpen} label="Requirements" value={requirementCount} />
          <AdminPageHeaderStat icon={Shield} label="Control mappings" value={controlLinks} />
          <AdminPageHeaderStat icon={GitCompareArrows} label="Crosswalk links" value={crosswalkLinks} />
        </div>
      </AdminPageHeader>

      <FrameworkLibraryHighlights
        frameworkCount={items.length}
        requirementCount={requirementCount}
        controlLinks={controlLinks}
        crosswalkLinks={crosswalkLinks}
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Standards catalog</h2>
          <p className="mt-1 text-sm text-slate-600">
            Open any framework to review clause-level requirements, provenance, and control coverage.
          </p>
        </div>

        <FrameworkLibraryGrid frameworks={items} />
      </div>
    </div>
  );
}
