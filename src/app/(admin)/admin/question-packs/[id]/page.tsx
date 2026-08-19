import { AdminQuestionPackEditor } from "@/components/admin-question-pack-editor";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminQuestionPackPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminQuestionPackEditor packId={id} />;
}
