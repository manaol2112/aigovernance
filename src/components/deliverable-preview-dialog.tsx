"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

type Props = {
  assessmentId: string;
  deliverableType: string;
  deliverableTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeliverablePreviewDialog({
  assessmentId,
  deliverableType,
  deliverableTitle,
  open,
  onOpenChange,
}: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setHtml(null);
    try {
      const res = await fetch(
        `/api/assessments/${assessmentId}/deliverables?type=${encodeURIComponent(deliverableType)}&format=html`
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Preview failed");
      }
      setHtml(await res.text());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load preview", { variant: "error" });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, deliverableType, onOpenChange]);

  useEffect(() => {
    if (open) void load();
    else setHtml(null);
  }, [open, load]);

  function openInNewTab() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,900px)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle>{deliverableTitle}</DialogTitle>
              <DialogDescription>
                Styled HTML preview — use PDF download for the formal client package.
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!html || loading}
              onClick={openInNewTab}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </Button>
          </div>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 bg-slate-200">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          )}
          {html && !loading && (
            <iframe
              title={deliverableTitle}
              srcDoc={html}
              className="h-full w-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
