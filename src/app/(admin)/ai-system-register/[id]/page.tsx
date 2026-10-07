import { AiSystemRegisterDetail } from "@/components/ai-system-register-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AiSystemRegisterDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AiSystemRegisterDetail systemId={id} />;
}
