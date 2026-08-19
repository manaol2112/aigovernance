"use client";

import dynamic from "next/dynamic";
import { BrandPageLoader } from "@/components/brand-page-loader";
import type { PackReport } from "@/lib/pillar-questionnaire-scoring";

const MaturityPackSurveyResults = dynamic(
  () =>
    import("@/components/maturity-pack-survey-results").then(
      (mod) => mod.MaturityPackSurveyResults
    ),
  {
    ssr: false,
    loading: () => <BrandPageLoader label="Preparing your report" />,
  }
);

/** Client-only shell — avoids SSR/client drift on interactive report UI. */
export function MaturityPackSurveyResultsClient(props: {
  sessionId: string;
  report: PackReport;
  backHref: string;
  backLabel: string;
  product?: "maturity" | "workshop";
}) {
  const report = <MaturityPackSurveyResults {...props} />;

  // Guided workshop routes use overflow-hidden main — need an inner scroll root (framework results do this too).
  if (props.product === "workshop") {
    return (
      <div
        data-maturity-scroll
        className="h-full min-h-0 overflow-y-auto scroll-smooth bg-slate-950 print:h-auto print:overflow-visible print:bg-white"
      >
        {report}
      </div>
    );
  }

  return report;
}

/** @deprecated Use sessionId — kept for call-site migration. */
export function PackSurveyResultsClient(props: {
  sessionId: string;
  report: PackReport;
  backHref: string;
  backLabel: string;
  product: "maturity" | "workshop";
}) {
  return <MaturityPackSurveyResultsClient {...props} />;
}
