"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FollowUpQuestionsExportButton({
  assessmentId,
  departmentQuery = "",
  size = "sm",
  variant = "outline",
  className,
}: {
  assessmentId: string;
  departmentQuery?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  className?: string;
}) {
  const [exporting, setExporting] = useState(false);

  async function exportHtml() {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/assessments/${assessmentId}/follow-up-questions?format=html${
          departmentQuery ? departmentQuery.replace("?", "&") : ""
        }`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `follow-up-questions-${assessmentId.slice(0, 8)}.html`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={exporting}
      onClick={() => void exportHtml()}
      className={className}
    >
      {exporting ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3.5 w-3.5" />
      )}
      Download follow-up questions
    </Button>
  );
}
