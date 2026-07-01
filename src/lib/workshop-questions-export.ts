import type { DepartmentWorkshopGuide } from "@/lib/department-workshop-guide";
import type { PillarWorkshopGuide } from "@/lib/pillar-workshop-guide";
import type {
  ConsolidatedWorkshopQuestion,
  SubPillarWorkshopBlock,
} from "@/lib/sub-pillar-workshop-questions";
import type { CriticalEvidenceProbe } from "@/lib/critical-evidence";

export type WorkshopExportMeta = {
  assessmentName: string;
  clientName?: string | null;
  clientIndustry?: string | null;
  frameworkCodes?: string[];
  scopeLabel: string;
  exportTitle: string;
  exportSubtitle?: string;
  includeEvidence?: boolean;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function buildWorkshopExportFilename(meta: WorkshopExportMeta): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = slugify(meta.exportTitle || meta.assessmentName || "workshop");
  return `workshop-questions-${base}-${date}.html`;
}

function phaseClass(phase: string): string {
  const map: Record<string, string> = {
    context: "phase-context",
    design: "phase-design",
    implementation: "phase-implementation",
    effectiveness: "phase-effectiveness",
    gaps: "phase-gaps",
    application: "phase-application",
    requirement: "phase-requirement",
  };
  return map[phase] ?? "phase-context";
}

function renderQuestion(q: ConsolidatedWorkshopQuestion, index: number): string {
  const probes =
    q.probes.length > 0
      ? `<div class="probes">
          <p class="probes-label">Discussion prompts your facilitator may use</p>
          <ul>${q.probes.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
        </div>`
      : "";

  return `<article class="question-card">
    <div class="question-head">
      <span class="question-num">${index + 1}</span>
      <span class="phase-badge ${phaseClass(q.phase)}">${escapeHtml(q.phaseLabel)}</span>
    </div>
    <p class="question-prompt">${escapeHtml(q.prompt)}</p>
    <p class="question-context">${escapeHtml(q.intent)}</p>
    ${probes}
  </article>`;
}

function renderTopicBlock(block: SubPillarWorkshopBlock, pillarAnchor: string): string {
  const topicId = `${pillarAnchor}-${slugify(block.subPillarId)}`;
  const questions = block.questions
    .map((q, i) => renderQuestion(q, i))
    .join("\n");

  return `<section class="topic-block" id="${topicId}">
    <header class="topic-header">
      <h3>${escapeHtml(block.subPillarLabel)}</h3>
      ${block.subPillarDescription ? `<p class="topic-desc">${escapeHtml(block.subPillarDescription)}</p>` : ""}
      <p class="topic-meta">${block.questionCount} question${block.questionCount !== 1 ? "s" : ""} · ${block.requirementsTotal} in-scope requirement${block.requirementsTotal !== 1 ? "s" : ""}</p>
    </header>
    <div class="questions">${questions}</div>
  </section>`;
}

function renderEvidenceProbe(ev: CriticalEvidenceProbe, index: number): string {
  return `<li class="evidence-item">
    <span class="evidence-num">${index + 1}</span>
    <div>
      <strong>${escapeHtml(ev.evidenceType)}</strong>
      <p>${escapeHtml(ev.description)}</p>
    </div>
  </li>`;
}

function renderPillarGuide(guide: PillarWorkshopGuide, includeEvidence: boolean): string {
  const pillarId = slugify(guide.pillarId);
  const topicToc = guide.subPillars
    .map(
      (b) =>
        `<li><a href="#${pillarId}-${slugify(b.subPillarId)}">${escapeHtml(b.subPillarLabel)} <span class="toc-count">${b.questionCount}</span></a></li>`
    )
    .join("");

  const topics = guide.subPillars.map((b) => renderTopicBlock(b, pillarId)).join("\n");

  const evidence =
    includeEvidence && guide.criticalEvidenceCount > 0
      ? `<details class="evidence-appendix">
          <summary>Reference — suggested evidence for ${escapeHtml(guide.pillarLabel)} (${guide.criticalEvidenceCount})</summary>
          <p class="evidence-note">Optional reference list. Your facilitator may ask whether these artifacts exist during the workshop.</p>
          <ul class="evidence-list">${guide.criticalEvidenceProbes.map(renderEvidenceProbe).join("")}</ul>
        </details>`
      : "";

  const questionTotal = guide.subPillars.reduce((n, s) => n + s.questionCount, 0);

  return `<section class="pillar-section" id="pillar-${pillarId}">
    <header class="pillar-header">
      <p class="pillar-eyebrow">Risk pillar</p>
      <h2>${escapeHtml(guide.pillarLabel)}</h2>
      <p class="pillar-desc">${escapeHtml(guide.pillarDescription)}</p>
      <div class="pillar-stats">
        <span>${guide.subPillars.length} topics</span>
        <span>${questionTotal} questions</span>
        <span>${guide.totalRequirements} requirements</span>
      </div>
    </header>
    <nav class="topic-toc" aria-label="Topics in ${escapeHtml(guide.pillarLabel)}">
      <p class="toc-label">Topics in this pillar</p>
      <ul>${topicToc}</ul>
    </nav>
    ${topics}
    ${evidence}
  </section>`;
}

function countQuestions(guides: PillarWorkshopGuide[]): number {
  return guides.reduce(
    (n, g) => n + g.subPillars.reduce((s, b) => s + b.questionCount, 0),
    0
  );
}

function renderDepartmentGuide(guide: DepartmentWorkshopGuide, includeEvidence: boolean): string {
  const sections = guide.sections
    .map(({ block, relevance }) => {
      const pillarId = slugify(block.pillarId);
      const topicHtml = renderTopicBlock(block, pillarId);
      return `<div class="dept-section" data-relevance="${relevance}">
        <p class="dept-pillar-label">${escapeHtml(block.pillarLabel)} · ${relevance === "primary" ? "Core topic" : "Supporting topic"}</p>
        ${topicHtml}
        ${
          includeEvidence && block.criticalEvidenceCount > 0
            ? `<details class="evidence-appendix compact">
                <summary>Reference evidence — ${escapeHtml(block.subPillarLabel)} (${block.criticalEvidenceCount})</summary>
                <ul class="evidence-list">${block.criticalEvidenceProbes.map(renderEvidenceProbe).join("")}</ul>
              </details>`
            : ""
        }
      </div>`;
    })
    .join("\n");

  return `<section class="department-export">
    <header class="pillar-header">
      <p class="pillar-eyebrow">Department perspective</p>
      <h2>${escapeHtml(guide.departmentLabel)}</h2>
      <p class="pillar-desc">${escapeHtml(guide.departmentDescription)}</p>
      <div class="pillar-stats">
        <span>${guide.totalQuestions} questions</span>
        <span>${guide.pillarLabels.length} pillars</span>
        <span>${guide.primarySectionCount} core topics</span>
      </div>
    </header>
    ${sections}
  </section>`;
}

export const WORKSHOP_EXPORT_STYLES = `
  :root {
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --surface: #f8fafc;
    --brand: #4f46e5;
    --brand-dark: #3730a3;
    --accent: #eef2ff;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--ink);
    background: #fff;
    line-height: 1.55;
    font-size: 15px;
  }
  .doc { max-width: 920px; margin: 0 auto; padding: 0 24px 64px; }
  .cover {
    margin: 0 -24px 48px;
    padding: 56px 48px 48px;
    background: linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #6366f1 100%);
    color: #fff;
    border-radius: 0 0 24px 24px;
  }
  .cover-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.85;
    margin: 0 0 12px;
  }
  .cover h1 {
    margin: 0 0 8px;
    font-size: clamp(1.75rem, 4vw, 2.35rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .cover-subtitle {
    margin: 0 0 28px;
    font-size: 1.05rem;
    opacity: 0.92;
    max-width: 36rem;
  }
  .cover-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin-top: 8px;
  }
  .cover-stat {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 12px;
    padding: 14px 16px;
  }
  .cover-stat-label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.75;
    margin-bottom: 4px;
  }
  .cover-stat-value { font-size: 1.1rem; font-weight: 600; }
  .intro {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 40px;
  }
  .intro h2 { margin: 0 0 8px; font-size: 1.1rem; }
  .intro p { margin: 0; color: var(--muted); font-size: 0.95rem; }
  .intro ul { margin: 12px 0 0; padding-left: 1.2rem; color: var(--muted); font-size: 0.92rem; }
  .toc {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 48px;
  }
  .toc h2 { margin: 0 0 16px; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .toc > ul { list-style: none; padding: 0; margin: 0; }
  .toc > ul > li { margin-bottom: 10px; }
  .toc > ul > li > a {
    color: var(--brand-dark);
    font-weight: 600;
    text-decoration: none;
    font-size: 1rem;
  }
  .toc > ul > li > a:hover { text-decoration: underline; }
  .toc-count {
    display: inline-block;
    margin-left: 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
    background: var(--surface);
    border-radius: 999px;
    padding: 1px 8px;
  }
  .pillar-section {
    margin-bottom: 56px;
    page-break-before: always;
  }
  .pillar-section:first-of-type { page-break-before: auto; }
  .pillar-header {
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 2px solid var(--line);
  }
  .pillar-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 10px;
    font-weight: 700;
    color: var(--brand);
    margin: 0 0 6px;
  }
  .pillar-header h2 {
    margin: 0 0 8px;
    font-size: 1.65rem;
    letter-spacing: -0.02em;
  }
  .pillar-desc { margin: 0 0 12px; color: var(--muted); max-width: 42rem; }
  .pillar-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pillar-stats span {
    font-size: 12px;
    font-weight: 500;
    background: var(--accent);
    color: var(--brand-dark);
    padding: 4px 10px;
    border-radius: 999px;
  }
  .topic-toc {
    background: var(--surface);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 28px;
  }
  .toc-label { margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .topic-toc ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px 16px; }
  .topic-toc a { color: var(--ink); text-decoration: none; font-size: 13px; font-weight: 500; }
  .topic-toc a:hover { color: var(--brand); }
  .topic-block {
    margin-bottom: 36px;
    border: 1px solid var(--line);
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
  }
  .topic-header {
    background: linear-gradient(to bottom, #f8fafc, #fff);
    padding: 20px 24px;
    border-bottom: 1px solid var(--line);
  }
  .topic-header h3 { margin: 0 0 6px; font-size: 1.15rem; }
  .topic-desc { margin: 0 0 8px; color: var(--muted); font-size: 0.9rem; }
  .topic-meta { margin: 0; font-size: 12px; color: var(--muted); }
  .questions { padding: 8px 0; }
  .question-card {
    padding: 20px 24px;
    border-bottom: 1px solid var(--line);
  }
  .question-card:last-child { border-bottom: none; }
  .question-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .question-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--brand);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }
  .phase-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 10px;
    border-radius: 999px;
  }
  .phase-context { background: #f1f5f9; color: #475569; }
  .phase-design { background: #ede9fe; color: #5b21b6; }
  .phase-implementation { background: #dbeafe; color: #1d4ed8; }
  .phase-effectiveness { background: #d1fae5; color: #047857; }
  .phase-gaps { background: #fef3c7; color: #b45309; }
  .phase-application { background: #e0e7ff; color: #3730a3; }
  .phase-requirement { background: #fce7f3; color: #be185d; }
  .question-prompt {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5;
  }
  .question-context {
    margin: 0 0 14px;
    font-size: 0.88rem;
    color: var(--muted);
    font-style: italic;
  }
  .probes {
    margin-bottom: 16px;
    padding: 12px 14px;
    background: var(--surface);
    border-radius: 10px;
    border: 1px dashed var(--line);
  }
  .probes-label { margin: 0 0 6px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .probes ul { margin: 0; padding-left: 1.1rem; font-size: 0.88rem; color: #475569; }
  .probes li { margin-bottom: 4px; }
  .evidence-appendix {
    margin-top: 24px;
    border: 1px solid #fde68a;
    border-radius: 12px;
    background: #fffbeb;
    padding: 0 16px 12px;
  }
  .evidence-appendix summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    color: #92400e;
    padding: 14px 4px;
  }
  .evidence-note { margin: 0 0 12px; font-size: 0.85rem; color: #a16207; }
  .evidence-list { list-style: none; padding: 0; margin: 0; }
  .evidence-item {
    display: flex;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid #fde68a;
    font-size: 0.9rem;
  }
  .evidence-num {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #d97706;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .evidence-item p { margin: 4px 0 0; color: var(--muted); font-size: 0.85rem; }
  .dept-pillar-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin: 0 0 8px 4px;
  }
  .dept-section { margin-bottom: 32px; }
  .doc-footer {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 1px solid var(--line);
    font-size: 12px;
    color: var(--muted);
    text-align: center;
  }
  @media print {
    body { font-size: 12px; }
    .cover { border-radius: 0; margin: 0 0 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pillar-section { page-break-before: always; }
    .question-card { page-break-inside: avoid; }
    details.evidence-appendix { display: none; }
  }
`;

export function buildWorkshopQuestionsHtml(
  meta: WorkshopExportMeta,
  guides: PillarWorkshopGuide[],
  departmentGuide?: DepartmentWorkshopGuide | null
): string {
  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const includeEvidence = meta.includeEvidence ?? true;
  const totalQuestions = departmentGuide
    ? departmentGuide.totalQuestions
    : countQuestions(guides);

  const bodyContent = departmentGuide
    ? renderDepartmentGuide(departmentGuide, includeEvidence)
    : guides.map((g) => renderPillarGuide(g, includeEvidence)).join("\n");

  const tocItems = departmentGuide
    ? departmentGuide.sections
        .map(
          ({ block }) =>
            `<li><a href="#${slugify(block.pillarId)}-${slugify(block.subPillarId)}">${escapeHtml(block.subPillarLabel)} <span class="toc-count">${block.questionCount}</span></a></li>`
        )
        .join("")
    : guides
        .map((g) => {
          const qCount = g.subPillars.reduce((n, s) => n + s.questionCount, 0);
          return `<li><a href="#pillar-${slugify(g.pillarId)}">${escapeHtml(g.pillarLabel)} <span class="toc-count">${qCount}</span></a></li>`;
        })
        .join("");

  const clientLine = meta.clientName
    ? `<div class="cover-stat"><span class="cover-stat-label">Prepared for</span><span class="cover-stat-value">${escapeHtml(meta.clientName)}</span></div>`
    : "";

  const frameworks =
    meta.frameworkCodes && meta.frameworkCodes.length > 0
      ? `<div class="cover-stat"><span class="cover-stat-label">Frameworks</span><span class="cover-stat-value">${escapeHtml(meta.frameworkCodes.join(", "))}</span></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.exportTitle)} — ${escapeHtml(meta.assessmentName)}</title>
  <style>${WORKSHOP_EXPORT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <header class="cover">
      <p class="cover-eyebrow">Workshop walkthrough guide</p>
      <h1>${escapeHtml(meta.exportTitle)}</h1>
      <p class="cover-subtitle">${escapeHtml(meta.exportSubtitle ?? "Facilitation questions for your AI governance workshop walkthrough — organized by risk area and topic.")}</p>
      <div class="cover-grid">
        <div class="cover-stat"><span class="cover-stat-label">Assessment</span><span class="cover-stat-value">${escapeHtml(meta.assessmentName)}</span></div>
        ${clientLine}
        <div class="cover-stat"><span class="cover-stat-label">Scope</span><span class="cover-stat-value">${escapeHtml(meta.scopeLabel)}</span></div>
        <div class="cover-stat"><span class="cover-stat-label">Questions</span><span class="cover-stat-value">${totalQuestions}</span></div>
        ${frameworks}
        <div class="cover-stat"><span class="cover-stat-label">Generated</span><span class="cover-stat-value">${escapeHtml(generated)}</span></div>
      </div>
    </header>

    <section class="intro">
      <h2>How to use this document</h2>
      <p>This guide lists the facilitation questions for your workshop walkthrough, organized by risk area and topic. Use it to follow the session structure and ensure each theme is covered with the right stakeholders.</p>
      <ul>
        <li>Questions are grouped by risk pillar and topic, in the order your facilitator will work through them.</li>
        <li>Phase labels (context, design, implementation, etc.) indicate where each question fits in the discussion flow.</li>
        <li>Optional evidence references are included at the end of each section — expand only if helpful during the session.</li>
        <li>Discussion prompts may be used by your facilitator when answers need more depth.</li>
      </ul>
    </section>

    <nav class="toc" aria-label="Table of contents">
      <h2>Contents</h2>
      <ul>${tocItems}</ul>
    </nav>

    ${bodyContent}

    <footer class="doc-footer">
      <p>Confidential — prepared for ${escapeHtml(meta.clientName ?? meta.assessmentName)} · ${escapeHtml(generated)}</p>
      <p>AI Governance Workshop · ${escapeHtml(meta.scopeLabel)}</p>
    </footer>
  </div>
</body>
</html>`;
}
