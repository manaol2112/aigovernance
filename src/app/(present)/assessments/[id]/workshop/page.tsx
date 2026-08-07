import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WorkshopPresentationView } from "@/components/workshop-presentation-view";

export default async function WorkshopPresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      }
    >
      <WorkshopPresentationView assessmentId={id} />
    </Suspense>
  );
}
