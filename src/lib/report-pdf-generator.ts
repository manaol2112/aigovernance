import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import { prisma } from "@/lib/db";
import {
  buildControlReviewReportData,
  type ControlReviewReportData,
} from "@/lib/control-review-reports";
import { getDisplayFindings } from "@/lib/report-narrative-generator";
import type { DeliverableType } from "@prisma/client";

const BRAND = {
  indigo: "#312e81",
  violet: "#4f46e5",
  slate: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  white: "#ffffff",
  wash: "#f8fafc",
};

const REPORT_LABELS: Record<DeliverableType, string> = {
  gap_assessment_report: "Gap Assessment Report",
  board_ready_summary: "Board Governance Summary",
  remediation_roadmap: "Remediation Roadmap",
  risk_control_matrix: "AI Governance Maturity Matrix",
};

type AssessmentMeta = {
  name: string;
  clientName: string | null;
  clientIndustry: string | null;
  frameworkCodes: string[];
  useCases: Array<{ name: string; description: string; useCaseType: string }>;
};

function stripCitations(text: string): string {
  return text.replace(/\[\{\d+\}\]/g, "").trim();
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").slice(0, 96);
}

function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function collectPdf(
  build: (doc: PDFKit.PDFDocument) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - 100;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > doc.page.height - 70) {
    doc.addPage();
    return drawContentHeader(doc);
  }
  return y;
}

function drawContentHeader(doc: PDFKit.PDFDocument): number {
  doc.save();
  doc.rect(0, 0, doc.page.width, 52).fill(BRAND.indigo);
  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(9).text("AI GOVERNANCE ASSESSMENT", 50, 20);
  doc.restore();
  return 68;
}

function drawCover(
  doc: PDFKit.PDFDocument,
  meta: AssessmentMeta,
  reportTitle: string,
  subtitle: string
) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BRAND.slate);
  doc.rect(0, 0, doc.page.width, 8).fill(BRAND.violet);

  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(11).text("CONFIDENTIAL", 50, 56);
  doc.fontSize(32).text(reportTitle, 50, 120, { width: contentWidth(doc) });
  doc.font("Helvetica").fontSize(14).fillColor("#cbd5e1").text(subtitle, 50, 200, { width: contentWidth(doc) });

  const boxY = 280;
  doc.roundedRect(50, boxY, contentWidth(doc), 140, 8).fill("#1e293b");
  doc.fillColor("#94a3b8").fontSize(9).text("ORGANIZATION", 70, boxY + 24);
  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(16).text(meta.clientName ?? meta.name, 70, boxY + 40);
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(9).text("INDUSTRY", 70, boxY + 72);
  doc.fillColor(BRAND.white).fontSize(11).text(meta.clientIndustry ?? "Not specified", 70, boxY + 86);
  doc.fillColor("#94a3b8").fontSize(9).text("REPORT DATE", 320, boxY + 72);
  doc.fillColor(BRAND.white).fontSize(11).text(formatDate(), 320, boxY + 86);

  doc.fillColor("#64748b").fontSize(9).text(
    "Prepared from reviewer-signed control evaluations · Source-verified workshop evidence",
    50,
    doc.page.height - 80,
    { width: contentWidth(doc), align: "center" }
  );
  doc.addPage();
}

function drawSection(doc: PDFKit.PDFDocument, y: number, title: string): number {
  y = ensureSpace(doc, y, 40);
  doc.fillColor(BRAND.indigo).font("Helvetica-Bold").fontSize(14).text(title, 50, y);
  doc.moveTo(50, y + 20).lineTo(doc.page.width - 50, y + 20).strokeColor(BRAND.violet).lineWidth(2).stroke();
  return y + 34;
}

function drawParagraph(doc: PDFKit.PDFDocument, y: number, text: string, opts?: { bold?: boolean }): number {
  doc.fillColor(BRAND.slate).font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
  const h = doc.heightOfString(text, { width: contentWidth(doc) });
  y = ensureSpace(doc, y, h + 8);
  doc.text(text, 50, y, { width: contentWidth(doc), lineGap: 3 });
  return y + h + 14;
}

function drawBulletList(doc: PDFKit.PDFDocument, y: number, items: string[]): number {
  for (const item of items) {
    y = ensureSpace(doc, y, 20);
    doc.fillColor(BRAND.violet).font("Helvetica-Bold").fontSize(10).text("•", 50, y);
    doc.fillColor(BRAND.slate).font("Helvetica").fontSize(10).text(item, 64, y, {
      width: contentWidth(doc) - 14,
      lineGap: 2,
    });
    const h = doc.heightOfString(item, { width: contentWidth(doc) - 14 });
    y += h + 8;
  }
  return y + 6;
}

function drawKpiStrip(
  doc: PDFKit.PDFDocument,
  y: number,
  kpis: Array<{ label: string; value: string; color: string }>
): number {
  y = ensureSpace(doc, y, 70);
  const colW = (contentWidth(doc) - 24) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = 50 + i * (colW + 8);
    doc.roundedRect(x, y, colW, 58, 6).fill(BRAND.wash).stroke(BRAND.line);
    doc.fillColor(BRAND.muted).fontSize(8).text(kpi.label.toUpperCase(), x + 12, y + 12, { width: colW - 24 });
    doc.fillColor(kpi.color).font("Helvetica-Bold").fontSize(20).text(kpi.value, x + 12, y + 28);
  });
  return y + 74;
}

function drawComplianceBar(
  doc: PDFKit.PDFDocument,
  y: number,
  report: ControlReviewReportData
): number {
  const total = report.reviewedControls.length || 1;
  const aligned = report.executiveSummary.alignedControls;
  const partial = report.executiveSummary.partialControls;
  const gap = report.executiveSummary.gapControls;
  const other = total - aligned - partial - gap;
  const segments = [
    { n: aligned, color: BRAND.emerald, label: "Aligned" },
    { n: partial, color: BRAND.amber, label: "Partial" },
    { n: gap, color: BRAND.red, label: "Gap" },
    { n: other, color: "#94a3b8", label: "Not assessed" },
  ].filter((s) => s.n > 0);

  y = ensureSpace(doc, y, 50);
  const barW = contentWidth(doc);
  let x = 50;
  for (const seg of segments) {
    const w = (seg.n / total) * barW;
    doc.rect(x, y, w, 14).fill(seg.color);
    x += w;
  }
  y += 22;
  for (const seg of segments) {
    doc.circle(52, y + 4, 4).fill(seg.color);
    doc.fillColor(BRAND.slate).fontSize(9).text(`${seg.label}: ${seg.n}`, 62, y);
    y += 14;
  }
  return y + 8;
}

function addPageFooters(doc: PDFKit.PDFDocument, footerLabel: string) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue;
    doc.fillColor(BRAND.muted).fontSize(8);
    doc.text(footerLabel, 50, doc.page.height - 40, { width: contentWidth(doc), align: "left" });
    doc.text(`Page ${i} of ${pages.count - 1}`, 50, doc.page.height - 40, {
      width: contentWidth(doc),
      align: "right",
    });
  }
}

function buildBoardSummaryPdf(
  doc: PDFKit.PDFDocument,
  meta: AssessmentMeta,
  report: ControlReviewReportData
) {
  drawCover(doc, meta, "Board Governance Summary", "Executive briefing for board and senior leadership");
  let y = drawContentHeader(doc);

  y = drawSection(doc, y, "Executive Headline");
  y = drawParagraph(doc, y, report.executiveSummary.headline, { bold: true });
  y = drawParagraph(doc, y, report.executiveSummary.narrative);

  y = drawSection(doc, y, "Key Metrics");
  y = drawKpiStrip(doc, y, [
    { label: "Signed off", value: `${report.reviewStats.confirmed}/${report.reviewStats.total}`, color: BRAND.violet },
    { label: "Aligned", value: String(report.executiveSummary.alignedControls), color: BRAND.emerald },
    { label: "Material gaps", value: String(report.executiveSummary.gapControls), color: BRAND.red },
    { label: "Pillars at risk", value: String(report.executiveSummary.pillarsAtRisk), color: BRAND.amber },
  ]);

  y = drawSection(doc, y, "Compliance Posture");
  y = drawComplianceBar(doc, y, report);

  y = drawSection(doc, y, "Maturity by Risk Pillar");
  for (const p of report.pillarMaturity.filter((x) => x.reviewedControls > 0)) {
    y = ensureSpace(doc, y, 28);
    doc.fillColor(BRAND.slate).font("Helvetica-Bold").fontSize(10).text(p.pillarLabel, 50, y);
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text(
      `${p.maturityLabel} · ${p.alignmentPct}% aligned · ${p.reviewedControls}/${p.totalControls} reviewed`,
      50,
      y + 14
    );
    y += 32;
  }

  if (report.executiveSummary.topGaps.length > 0) {
    y = drawSection(doc, y, "Priority Risks for Board Attention");
    y = drawBulletList(
      doc,
      y,
      report.executiveSummary.topGaps.map((g) => {
        const impact = g.businessImpact ? ` ${g.businessImpact}` : "";
        return `${g.controlTitle} (${g.pillarLabel}): ${g.summary}${impact}`;
      })
    );
  }

  y = drawSection(doc, y, "Recommended Board Actions");
  const boardActions =
    report.executiveSummary.boardActions.length > 0
      ? report.executiveSummary.boardActions
      : [
          "Direct management to close material control gaps identified in the signed-off assessment.",
          "Approve a remediation roadmap with accountable owners and target dates.",
          "Establish quarterly AI governance reporting to leadership.",
        ];
  y = drawBulletList(doc, y, boardActions);

  if (!report.reviewStats.reportingReady) {
    y = drawParagraph(
      doc,
      y,
      `Note: ${report.reviewStats.pendingReview} control(s) pending sign-off. Board distribution should await complete review.`,
      { bold: true }
    );
  }

  addPageFooters(doc, `${meta.clientName ?? meta.name} · Board Governance Summary`);
}

function buildGapReportPdf(
  doc: PDFKit.PDFDocument,
  meta: AssessmentMeta,
  report: ControlReviewReportData
) {
  drawCover(doc, meta, "Gap Assessment Report", "Formal register of reviewer-signed control findings");
  let y = drawContentHeader(doc);

  y = drawSection(doc, y, "Executive Summary");
  y = drawParagraph(doc, y, report.executiveSummary.narrative);
  y = drawKpiStrip(doc, y, [
    { label: "In report", value: String(report.reviewedControls.length), color: BRAND.violet },
    { label: "Aligned", value: String(report.executiveSummary.alignedControls), color: BRAND.emerald },
    { label: "With gaps", value: String(report.reviewedControls.length - report.executiveSummary.alignedControls), color: BRAND.red },
    { label: "Review complete", value: `${report.reviewStats.reviewCompletePct}%`, color: BRAND.indigo },
  ]);

  const gaps = report.reviewedControls.filter((c) =>
    ["gap", "partial", "not_assessed"].includes(c.complianceStatus)
  );

  y = drawSection(doc, y, `Gap Register (${gaps.length} controls)`);
  for (const ctrl of gaps) {
    y = ensureSpace(doc, y, 120);
    doc.roundedRect(50, y, contentWidth(doc), 4, 2).fill(
      ctrl.complianceStatus === "gap" ? BRAND.red : BRAND.amber
    );
    y += 12;
    doc.fillColor(BRAND.indigo).font("Helvetica-Bold").fontSize(11).text(
      `${ctrl.controlCode} — ${ctrl.controlTitle}`,
      50,
      y
    );
    doc.fillColor(BRAND.muted).fontSize(8).text(
      `${ctrl.pillarLabel} · ${ctrl.complianceStatus.replace("_", " ").toUpperCase()}${ctrl.confirmedBy ? ` · Signed off by ${ctrl.confirmedBy}` : ""}`,
      50,
      y + 16
    );
    y += 34;
    const display = getDisplayFindings(ctrl, report.clientName);
    y = drawParagraph(doc, y, `In place: ${display.inPlace.slice(0, 500)}`);
    y = drawParagraph(doc, y, `Gap: ${display.gap.slice(0, 500)}`);
    y = drawParagraph(doc, y, `Recommendation: ${display.recommendation.slice(0, 500)}`);
    y += 8;
  }

  addPageFooters(doc, `${meta.clientName ?? meta.name} · Gap Assessment Report`);
}

function buildRoadmapPdf(doc: PDFKit.PDFDocument, meta: AssessmentMeta, report: ControlReviewReportData) {
  drawCover(doc, meta, "Remediation Roadmap", "Prioritized action plan derived from signed-off recommendations");
  let y = drawContentHeader(doc);

  y = drawSection(doc, y, "Overview");
  y = drawParagraph(
    doc,
    y,
    "This roadmap sequences remediation actions by pillar criticality and gap severity. Each item maps to a signed-off control recommendation."
  );

  const phases = ["immediate", "short_term", "medium_term"] as const;
  for (const phase of phases) {
    const steps = report.roadmap.filter((r) => r.phase === phase);
    if (steps.length === 0) continue;
    y = drawSection(doc, y, steps[0].phaseLabel);
    for (const step of steps) {
      y = ensureSpace(doc, y, 50);
      doc.circle(58, y + 8, 10).fill(BRAND.violet);
      doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(8).text(String(step.priority), 54, y + 4);
      doc.fillColor(BRAND.slate).font("Helvetica-Bold").fontSize(10).text(
        `${step.controlCode} — ${step.controlTitle}`,
        76,
        y
      );
      doc.fillColor(BRAND.muted).fontSize(8).text(step.pillarLabel, 76, y + 14);
      y = drawParagraph(doc, y + 28, step.action);
    }
  }

  y = drawSection(doc, y, "Continuous Improvement");
  y = drawBulletList(doc, y, [
    "Establish periodic AI governance review cycle",
    "Maintain evidence repository per canonical control library",
    "Re-assess upon material AI system changes",
  ]);

  addPageFooters(doc, `${meta.clientName ?? meta.name} · Remediation Roadmap`);
}

function buildMaturityMatrixPdf(
  doc: PDFKit.PDFDocument,
  meta: AssessmentMeta,
  report: ControlReviewReportData
) {
  drawCover(doc, meta, "AI Governance Maturity Matrix", "Risk pillar maturity assessment across the control library");
  let y = drawContentHeader(doc);

  y = drawSection(doc, y, "Maturity Overview");
  y = drawParagraph(
    doc,
    y,
    "Maturity levels are derived from alignment of reviewer-signed controls within each risk pillar. Unreviewed controls are excluded."
  );

  y = ensureSpace(doc, y, 30);
  const cols = [180, 90, 70, 80, 90];
  const headers = ["Risk Pillar", "Maturity", "Alignment", "Reviewed", "Gaps"];
  let x = 50;
  doc.rect(50, y, contentWidth(doc), 22).fill(BRAND.indigo);
  headers.forEach((h, i) => {
    doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(8).text(h, x + 8, y + 7, { width: cols[i] - 8 });
    x += cols[i];
  });
  y += 24;

  for (const p of report.pillarMaturity) {
    y = ensureSpace(doc, y, 24);
    x = 50;
    const row = [
      p.pillarLabel,
      p.maturityLabel,
      `${p.alignmentPct}%`,
      `${p.reviewedControls}/${p.totalControls}`,
      String(p.gapCount + p.partialCount),
    ];
    doc.rect(50, y, contentWidth(doc), 22).fill(y % 48 === 24 ? BRAND.wash : BRAND.white).stroke(BRAND.line);
    row.forEach((cell, i) => {
      doc.fillColor(BRAND.slate).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8).text(cell, x + 8, y + 7, {
        width: cols[i] - 10,
      });
      x += cols[i];
    });
    y += 24;
  }

  y += 16;
  y = drawSection(doc, y, "Maturity Scale");
  y = drawBulletList(doc, y, [
    "Optimized (91–100% aligned)",
    "Managed (76–90%)",
    "Defined (51–75%)",
    "Developing (26–50%)",
    "Initial (0–25%)",
    "Not Implemented (no reviewed controls)",
  ]);

  addPageFooters(doc, `${meta.clientName ?? meta.name} · Maturity Matrix`);
}

export async function generateDeliverablePdf(
  assessmentId: string,
  type: DeliverableType
): Promise<{ title: string; buffer: Buffer; filename: string }> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { scope: true, useCases: true },
  });
  if (!assessment) throw new Error("Assessment not found");

  const report = await buildControlReviewReportData(assessmentId);
  const meta: AssessmentMeta = {
    name: assessment.name,
    clientName: assessment.clientName,
    clientIndustry: assessment.clientIndustry,
    frameworkCodes: assessment.scope?.frameworkCodes ?? [],
    useCases: assessment.useCases.map((u) => ({
      name: u.name,
      description: u.description,
      useCaseType: u.useCaseType,
    })),
  };

  const title = `${REPORT_LABELS[type]} — ${meta.clientName ?? meta.name}`;
  const clientSlug = safeFilename(meta.clientName ?? meta.name);

  const buffer = await collectPdf((doc) => {
    switch (type) {
      case "board_ready_summary":
        buildBoardSummaryPdf(doc, meta, report);
        break;
      case "gap_assessment_report":
        buildGapReportPdf(doc, meta, report);
        break;
      case "remediation_roadmap":
        buildRoadmapPdf(doc, meta, report);
        break;
      case "risk_control_matrix":
        buildMaturityMatrixPdf(doc, meta, report);
        break;
      default:
        throw new Error(`Unknown deliverable type: ${type}`);
    }
  });

  const filename = `${safeFilename(REPORT_LABELS[type])}-${clientSlug}.pdf`;
  return { title, buffer, filename };
}
