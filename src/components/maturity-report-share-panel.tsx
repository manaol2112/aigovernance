"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function MaturityReportSharePanel({
  surveyId,
  organizationName,
  surveyModeLabel,
  className,
}: {
  surveyId: string;
  organizationName: string;
  surveyModeLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  useEffect(() => {
    setReportUrl(
      `${window.location.origin}/maturity-assessment/${surveyId}/results`
    );
    setHasNativeShare("share" in navigator);
  }, [surveyId]);

  const mailtoHref = useMemo(() => {
    if (!reportUrl) return null;
    const subject = encodeURIComponent(
      `AI Governance Maturity Report — ${organizationName}`
    );
    const body = encodeURIComponent(
      `Hello,\n\nI've completed an AI governance maturity assessment for ${organizationName} (${surveyModeLabel}).\n\nPlease review the full report here:\n${reportUrl}\n\nThis includes maturity scores, priority gaps, and a remediation roadmap prepared for leadership review.\n\nThank you.`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  }, [organizationName, reportUrl, surveyModeLabel]);

  const copyLink = useCallback(async () => {
    if (!reportUrl) return;
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      toast("Report link copied.", { variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link.", { variant: "error" });
    }
  }, [reportUrl]);

  const shareNative = useCallback(async () => {
    if (!reportUrl || !navigator.share) {
      void copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `AI Governance Maturity — ${organizationName}`,
        text: `Review the maturity assessment for ${organizationName}.`,
        url: reportUrl,
      });
    } catch {
      /* user cancelled */
    }
  }, [copyLink, organizationName, reportUrl]);

  const ready = reportUrl !== null && mailtoHref !== null;

  return (
    <div
      className={
        className ??
        "rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm print:hidden"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Share with leadership
      </p>
      <p className="mt-1 text-sm text-slate-300">
        Send this report to your CRO, board sponsor, or audit committee.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ready ? (
          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-xl bg-white/10 text-white hover:bg-white/15"
          >
            <a href={mailtoHref}>
              <Mail className="h-3.5 w-3.5" />
              Email report link
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled
            className="gap-1.5 rounded-xl bg-white/10 text-white"
          >
            <Mail className="h-3.5 w-3.5" />
            Email report link
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!ready}
          className="gap-1.5 rounded-xl border-white/15 bg-transparent text-white hover:bg-white/10"
          onClick={copyLink}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </Button>
        {hasNativeShare && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!ready}
            className="gap-1.5 rounded-xl border-white/15 bg-transparent text-white hover:bg-white/10"
            onClick={shareNative}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        )}
      </div>
    </div>
  );
}
