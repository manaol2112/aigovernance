import { Suspense } from "react";
import { AiSystemRegisterNewForm } from "@/components/ai-system-register-new-form";

export const dynamic = "force-dynamic";

export default function NewAiSystemRegisterPage() {
  return (
    <Suspense fallback={<div className="px-6 py-16 text-sm text-slate-500">Loading…</div>}>
      <AiSystemRegisterNewForm />
    </Suspense>
  );
}
