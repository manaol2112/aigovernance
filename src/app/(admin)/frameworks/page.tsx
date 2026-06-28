import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { FrameworkScopeNotice } from "@/components/framework-scope-notice";

export const dynamic = "force-dynamic";

export default async function FrameworksPage() {
  const frameworks = await prisma.framework.findMany({
    include: { _count: { select: { requirements: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Framework Library</h1>
        <p className="mt-2 text-slate-500">
          Browse source-verified requirements with clause IDs and provenance citations.
        </p>
      </div>

      <FrameworkScopeNotice compact />

      <div className="grid gap-6 md:grid-cols-2">
        {frameworks.map((fw) => (
          <Link key={fw.id} href={`/frameworks/${fw.code}`}>
            <Card className="h-full transition-all hover:border-slate-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{fw.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {fw.publisher} · Version {fw.version}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{fw.code}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{fw._count.requirements}</span>
                  <span className="text-sm text-slate-500">requirements</span>
                </div>
                <div className="mt-4 flex items-center text-sm font-medium text-slate-600">
                  Browse requirements <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
