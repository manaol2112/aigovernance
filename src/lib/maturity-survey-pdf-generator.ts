import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import type { MaturitySurveyReport } from "@/lib/maturity-survey-analysis";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { formatGapSeverity } from "@/lib/maturity-client-copy";
import { DELOITTE_BRAND as BRAND } from "@/lib/deloitte-brand";

const FRAMEWORK_SHORT = Object.fromEntries(
  FRAMEWORK_COLUMNS.map((fw) => [fw.code, fw.short])
) as Record<string, string>;

function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function collectPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
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
  doc.rect(0, 0, doc.page.width, 52).fill(BRAND.black);
  doc.rect(0, 0, 6, 52).fill(BRAND.green);
  doc.fillColor(BRAND.green).font("Helvetica-Bold").fontSize(10).text("Deloitte", 50, 16);
  doc.fillColor(BRAND.white).font("Helvetica").fontSize(8).text("AI MATURITY ASSESSMENT", 50, 30);
  doc.restore();
  return 68;
}

function drawCover(doc: PDFKit.PDFDocument, report: MaturitySurveyReport) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BRAND.black);
  doc.rect(0, 0, doc.page.width, 10).fill(BRAND.green);

  doc.fillColor(BRAND.green).font("Helvetica-Bold").fontSize(22).text("Deloitte.", 50, 56);
  doc.fillColor(BRAND.white).font("Helvetica").fontSize(10).text("CONFIDENTIAL", 50, 88);

  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(28).text("AI Governance", 50, 118, {
    width: contentWidth(doc),
  });
  doc.fontSize(28).text("Maturity Report", 50, 152, { width: contentWidth(doc) });

  doc.font("Helvetica").fontSize(13).fillColor(BRAND.green).text(report.surveyModeLabel, 50, 198, {
    width: contentWidth(doc),
  });

  const boxY = 240;
  const boxH = report.respondentName ? 168 : 140;
  doc.roundedRect(50, boxY, contentWidth(doc), boxH, 4).fill(BRAND.charcoal);
  doc.rect(50, boxY, 4, boxH).fill(BRAND.green);

  doc.fillColor(BRAND.muted).fontSize(9).text("ORGANIZATION", 70, boxY + 22);
  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(16).text(report.organizationName, 70, boxY + 38);

  if (report.respondentName) {
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("PREPARED BY", 70, boxY + 72);
    doc.fillColor(BRAND.white).fontSize(11).text(
      report.respondentRole
        ? `${report.respondentName} · ${report.respondentRole}`
        : report.respondentName,
      70,
      boxY + 86
    );
  }

  const metaY = report.respondentName ? 112 : 72;
  doc.fillColor(BRAND.muted).fontSize(9).text("REPORT DATE", 70, boxY + metaY);
  doc.fillColor(BRAND.white).fontSize(11).text(formatReportDate(report.generatedAt), 70, boxY + metaY + 14);

  doc.fillColor(BRAND.muted).fontSize(9).text("FRAMEWORKS IN SCOPE", 320, boxY + metaY);
  doc.fillColor(BRAND.white).fontSize(10).text(
    report.frameworkCodes.map((code) => FRAMEWORK_SHORT[code] ?? code).join(" · "),
    320,
    boxY + metaY + 14,
    { width: 200 }
  );

  doc.fillColor(BRAND.slate).fontSize(9).text(
    "Based on your maturity selections · Rule-based scoring · Not AI-generated findings",
    50,
    doc.page.height - 80,
    { width: contentWidth(doc), align: "center" }
  );
  doc.addPage();
}

function drawSection(doc: PDFKit.PDFDocument, y: number, title: string): number {
  y = ensureSpace(doc, y, 40);
  doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(14).text(title, 50, y);
  doc.moveTo(50, y + 20).lineTo(doc.page.width - 50, y + 20).strokeColor(BRAND.green).lineWidth(2.5).stroke();
  return y + 34;
}

function drawParagraph(doc: PDFKit.PDFDocument, y: number, text: string, opts?: { bold?: boolean }): number {
  doc.fillColor(BRAND.black).font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
  const h = doc.heightOfString(text, { width: contentWidth(doc) });
  y = ensureSpace(doc, y, h + 8);
  doc.text(text, 50, y, { width: contentWidth(doc), lineGap: 3 });
  return y + h + 14;
}

function drawBulletList(doc: PDFKit.PDFDocument, y: number, items: string[]): number {
  for (const item of items) {
    y = ensureSpace(doc, y, 20);
    doc.fillColor(BRAND.green).font("Helvetica-Bold").fontSize(10).text("•", 50, y);
    doc.fillColor(BRAND.black).font("Helvetica").fontSize(10).text(item, 64, y, {
      width: contentWidth(doc) - 14,
      lineGap: 2,
    });
    const h = doc.heightOfString(item, { width: contentWidth(doc) - 14 });
    y += h + 8;
  }
  return y + 6;
}

function addPageFooters(doc: PDFKit.PDFDocument, label: string) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue;
    doc.fillColor(BRAND.muted).fontSize(8);
    doc.text(label, 50, doc.page.height - 40, { width: contentWidth(doc), align: "left" });
    doc.text(`Page ${i} of ${pages.count - 1}`, 50, doc.page.height - 40, {
      width: contentWidth(doc),
      align: "right",
    });
  }
}

function buildMaturityPdf(doc: PDFKit.PDFDocument, report: MaturitySurveyReport) {
  const footerLabel = `${report.organizationName} · ${report.surveyModeLabel}`;

  drawCover(doc, report);
  let y = drawContentHeader(doc);

  y = drawSection(doc, y, "Executive Summary");
  y = drawParagraph(doc, y, report.executiveSummary.headline, { bold: true });
  y = drawParagraph(doc, y, report.executiveSummary.narrative);

  y = drawSection(doc, y, "Overall Maturity");
  y = drawParagraph(
    doc,
    y,
    `${report.overallMaturityLabel} (${report.overallScorePct}%) · ${report.scope.controlsAssessed} control${report.scope.controlsAssessed === 1 ? "" : "s"} assessed across ${report.scope.pillarsAssessed} pillar${report.scope.pillarsAssessed === 1 ? "" : "s"}.`
  );

  if (report.executiveSummary.boardActions.length > 0) {
    y = drawSection(doc, y, "Recommended Leadership Actions");
    y = drawBulletList(doc, y, report.executiveSummary.boardActions);
  }

  const topGaps = [...report.gaps]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 8);

  if (topGaps.length > 0) {
    y = drawSection(doc, y, "Priority Gaps");
    for (const gap of topGaps) {
      const fw = gap.frameworkCodes.map((c) => FRAMEWORK_SHORT[c] ?? c).join(", ");
      y = ensureSpace(doc, y, 50);
      const severityColor =
        gap.severity === "critical" ? BRAND.red : gap.severity === "high" ? BRAND.amber : BRAND.slate;
      doc.fillColor(severityColor).font("Helvetica-Bold").fontSize(9).text(formatGapSeverity(gap.severity), 50, y);
      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text(gap.controlTitle, 50, y + 14, {
        width: contentWidth(doc),
      });
      doc.fillColor(BRAND.slate).font("Helvetica").fontSize(9).text(
        `${gap.pillarLabel}${fw ? ` · ${fw}` : ""} · ${gap.maturityLabel}`,
        50,
        y + 28
      );
      y = drawParagraph(doc, y + 40, gap.summary);
    }
  }

  const pillars = [...report.pillarMaturity]
    .filter((p) => p.reviewedControls > 0)
    .sort((a, b) => a.alignmentPct - b.alignmentPct);

  if (pillars.length > 0) {
    y = drawSection(doc, y, "Pillar Maturity");
    for (const pillar of pillars) {
      y = ensureSpace(doc, y, 24);
      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text(pillar.pillarLabel, 50, y);
      doc.fillColor(BRAND.green).font("Helvetica-Bold").fontSize(10).text(`${pillar.alignmentPct}%`, 50, y, {
        width: contentWidth(doc),
        align: "right",
      });
      doc.fillColor(BRAND.slate).font("Helvetica").fontSize(9).text(
        `${pillar.maturityLabel} · ${pillar.reviewedControls} control${pillar.reviewedControls === 1 ? "" : "s"}`,
        50,
        y + 14
      );
      y += 32;
    }
  }

  const roadmap = report.roadmap.slice(0, 10);
  if (roadmap.length > 0) {
    y = drawSection(doc, y, "Remediation Roadmap");
    for (const step of roadmap) {
      y = ensureSpace(doc, y, 40);
      doc.fillColor(BRAND.greenDark).font("Helvetica-Bold").fontSize(9).text(`${step.priority}. ${step.phaseLabel}`, 50, y);
      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text(step.controlTitle, 50, y + 14, {
        width: contentWidth(doc),
      });
      y = drawParagraph(doc, y + 28, step.action);
    }
  }

  if (report.pillarDeepDive) {
    y = drawSection(doc, y, `Pillar Focus: ${report.pillarDeepDive.pillarLabel}`);
    y = drawParagraph(doc, y, report.pillarDeepDive.pathForward.narrative);
    y = drawParagraph(doc, y, report.pillarDeepDive.pathForward.leadershipAction, { bold: true });
  }

  y = drawSection(doc, y, "Methodology");
  y = drawParagraph(doc, y, report.scope.methodologyNote);

  addPageFooters(doc, footerLabel);
}

export async function generateMaturitySurveyPdf(report: MaturitySurveyReport): Promise<Buffer> {
  return collectPdf((doc) => buildMaturityPdf(doc, report));
}

export function buildMaturityExportFilename(report: MaturitySurveyReport): string {
  return `${safeFilename(report.organizationName)}-maturity-report.pdf`;
}
