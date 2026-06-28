import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { titleCase, formatDate } from "@/lib/utils";
import { WORKFLOW_STEPS } from "@/lib/use-case-types";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    include: {
      scope: true,
      useCases: true,
      checkpoints: true,
      _count: { select: { requirementEvaluations: true, deliverables: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Assessments</h1>
          <p className="mt-2 text-slate-500">
            Enterprise AI governance assessments with human-in-the-loop workflow and formal deliverables.
          </p>
        </div>
        <Button asChild>
          <Link href="/assessments/new"><Plus className="mr-1 h-4 w-4" /> New Assessment</Link>
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-slate-500">No assessments yet. Start a client engagement.</p>
            <Button asChild className="mt-4"><Link href="/assessments/new">Create Assessment</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assessments.map((a) => {
            const step = WORKFLOW_STEPS.find((s) => s.stage === a.workflowStage);
            const pendingCp = a.checkpoints.filter((c) => c.status === "pending").length;
            return (
              <Card key={a.id} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{a.name}</CardTitle>
                        <Badge variant="outline">{titleCase(a.status)}</Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {a.clientName}{a.clientIndustry ? ` · ${a.clientIndustry}` : ""} · {formatDate(a.createdAt)}
                      </CardDescription>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/assessments/${a.id}/workflow`}>
                        Continue <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>Stage: {step?.label ?? a.workflowStage}</span>
                    <span>{a.useCases.length} use case(s)</span>
                    <span>{a._count.requirementEvaluations} evaluations</span>
                    <span>{a._count.deliverables} deliverables</span>
                    {pendingCp > 0 && <Badge variant="warning">{pendingCp} pending approval(s)</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
