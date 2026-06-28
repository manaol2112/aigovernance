import { AssessmentWorkflow } from "@/components/assessment-workflow";

export const dynamic = "force-dynamic";

export default async function AssessmentWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssessmentWorkflow assessmentId={id} />;
}
