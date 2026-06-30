"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  assessmentId: string;
  assessmentName: string;
  variant?: "list" | "workflow";
};

export function DeleteAssessmentButton({
  assessmentId,
  assessmentName,
  variant = "list",
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(
      `Delete "${assessmentName}"?\n\nThis permanently removes all use cases, scoped requirements, workshop notes, evidence, and deliverables for this assessment.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, { method: "DELETE" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(result.error ?? "Failed to delete assessment");
        return;
      }
      router.push("/assessments");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (variant === "workflow") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
        Delete Assessment
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
      onClick={handleDelete}
      disabled={deleting}
      title="Delete assessment"
    >
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
