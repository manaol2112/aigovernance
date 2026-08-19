import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import {
  buildPackRoadmap,
  derivePackExecutiveSummary,
  groupPackRoadmapByPhase,
  scoreBandLabel,
  type PackReport,
} from "@/lib/pillar-questionnaire-scoring";
import { PACK_ASSESSMENT_COPY, type PackClientCopy } from "@/lib/maturity-client-copy";
import { DELOITTE_BRAND as BRAND } from "@/lib/deloitte-brand";

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

function drawParagraph(doc: PDFKit.PDFDocument, y: number, text: string, opts?: { bold?: boolean }) {
  doc
    .fillColor(BRAND.black)
    .font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(10)
    .text(text, 50, y, { width: contentWidth(doc), lineGap: 3 });
  return doc.y + 8;
}

function drawSection(doc: PDFKit.PDFDocument, y: number, title: string): number {
  y = ensureSpace(doc, y, 48);
  doc.fillColor(BRAND.greenDark).font("Helvetica-Bold").fontSize(13).text(title, 50, y);
  doc.moveTo(50, y + 18).lineTo(doc.page.width - 50, y + 18).strokeColor(BRAND.green).lineWidth(1).stroke();
  return y + 28;
}

function addPageFooters(doc: PDFKit.PDFDocument, label: string) {
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue;
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(8).text(label, 50, doc.page.height - 36, {
      width: contentWidth(doc),
      align: "center",
    });
  }
}

function buildPackPdf(doc: PDFKit.PDFDocument, report: PackReport, copy: PackClientCopy) {
  const summary = derivePackExecutiveSummary(report);
  const roadmap = buildPackRoadmap(report);
  const roadmapByPhase = groupPackRoadmapByPhase(roadmap);
  const footerLabel = copy.printConfidential;

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BRAND.black);
  doc.rect(0, 0, doc.page.width, 10).fill(BRAND.green);
  doc.fillColor(BRAND.green).font("Helvetica-Bold").fontSize(22).text("Deloitte.", 50, 56);
  doc.fillColor(BRAND.white).font("Helvetica").fontSize(10).text("CONFIDENTIAL", 50, 88);
  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(28).text(copy.printTitle, 50, 118, {
    width: contentWidth(doc),
  });

  const boxY = 200;
  doc.roundedRect(50, boxY, contentWidth(doc), 120, 4).fill(BRAND.charcoal);
  doc.rect(50, boxY, 4, 120).fill(BRAND.green);
  doc.fillColor(BRAND.muted).fontSize(9).text("ORGANIZATION", 70, boxY + 22);
  doc.fillColor(BRAND.white).font("Helvetica-Bold").fontSize(16).text(report.organizationName, 70, boxY + 38);
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("OVERALL POSTURE", 70, boxY + 72);
  doc.fillColor(BRAND.white).fontSize(14).text(summary.scoreLabel, 70, boxY + 86);
  doc.fillColor(BRAND.muted).fontSize(9).text("REPORT DATE", 320, boxY + 72);
  doc.fillColor(BRAND.white).fontSize(11).text(formatReportDate(report.generatedAt), 320, boxY + 86);

  doc.addPage();
  let y = drawContentHeader(doc);

  y = drawSection(doc, y, "Executive Summary");
  y = drawParagraph(doc, y, summary.narrative);
  y = drawParagraph(doc, y, summary.headline, { bold: true });

  y = drawSection(doc, y, "Posture by Pillar");
  for (const pillar of report.pillarScores.filter((item) => item.questionCount > 0)) {
    y = ensureSpace(doc, y, 36);
    const posture = scoreBandLabel(pillar.alignmentPct);
    doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text(pillar.pillarLabel, 50, y);
    doc.fillColor(BRAND.greenDark).font("Helvetica").fontSize(9).text(posture.shortLabel, 360, y);
    doc
      .fillColor(BRAND.muted)
      .fontSize(8)
      .text(
        `${pillar.yesCount} in place · ${pillar.partialCount} underway · ${pillar.noCount} not yet · ${pillar.dontKnowCount} to confirm`,
        50,
        y + 14
      );
    y += 32;
  }

  if (report.strengths.length > 0) {
    y = drawSection(doc, y, "Strengths");
    for (const item of report.strengths.slice(0, 12)) {
      y = ensureSpace(doc, y, 28);
      doc.fillColor(BRAND.greenDark).font("Helvetica-Bold").fontSize(9).text(item.pillarLabel, 50, y);
      y = drawParagraph(doc, y + 12, item.summary);
    }
  }

  if (report.gaps.length > 0) {
    y = drawSection(doc, y, "Priority Improvements");
    for (const [index, item] of report.gaps.slice(0, 12).entries()) {
      y = ensureSpace(doc, y, 36);
      doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text(`${index + 1}. ${item.pillarLabel}`, 50, y);
      y = drawParagraph(doc, y + 14, item.summary);
    }
  }

  if (roadmap.length > 0) {
    y = drawSection(doc, y, "Recommended Next Steps");
    for (const phase of ["immediate", "short_term", "medium_term"] as const) {
      const steps = roadmapByPhase[phase];
      if (steps.length === 0) continue;
      y = ensureSpace(doc, y, 24);
      doc.fillColor(BRAND.greenDark).font("Helvetica-Bold").fontSize(10).text(steps[0]!.phaseLabel, 50, y);
      y += 16;
      for (const step of steps.slice(0, 8)) {
        y = ensureSpace(doc, y, 40);
        doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(9).text(`${step.priority}. ${step.pillarLabel}`, 50, y);
        y = drawParagraph(doc, y + 12, step.summary);
        y = drawParagraph(doc, y, step.action);
      }
    }
  }

  y = drawSection(doc, y, "About This Report");
  y = drawParagraph(doc, y, copy.aboutReport);

  addPageFooters(doc, footerLabel);
}

export async function generatePackMaturityPdf(
  report: PackReport,
  copy: PackClientCopy = PACK_ASSESSMENT_COPY
): Promise<Buffer> {
  return collectPdf((doc) => buildPackPdf(doc, report, copy));
}

export function buildPackExportFilename(
  report: PackReport,
  prefix = "maturity-report"
): string {
  return `${safeFilename(report.organizationName)}-${prefix}.pdf`;
}
