"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function MaturityReportExportButton({
  surveyId,
  organizationName,
  className,
}: {
  surveyId: string;
  organizationName: string;
  className?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/maturity-surveys/${surveyId}/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeOrg = organizationName.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40);
      anchor.href = url;
      anchor.download = `maturity-report-${safeOrg || surveyId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast("Report downloaded.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to download report.", {
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Preparing PDF…
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>
    </div>
  );
}
