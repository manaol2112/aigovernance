import { redirect } from "next/navigation";

export default async function AssessmentDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/assessments/${id}/workflow`);
}
