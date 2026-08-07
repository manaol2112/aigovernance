import type { ControlFollowUpEntry, FollowUpPack, FollowUpQuestionItem } from "@/lib/follow-up-questions-types";
import {
  escapeHtml,
  slugify,
  WORKSHOP_EXPORT_STYLES,
} from "@/lib/workshop-questions-export";

export type FollowUpExportMeta = {
  assessmentName: string;
  clientName?: string | null;
  scopeLabel?: string;
};

const FOLLOW_UP_EXTRA_STYLES = `
  .phase-recommended { background: #eef2ff; color: #3730a3; }
  .phase-custom { background: #ecfdf5; color: #047857; }
  .control-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85em;
    font-weight: 700;
    color: var(--brand-dark);
  }
  .control-block { margin-bottom: 28px; }
  .control-header h3 .control-code { margin-right: 8px; }
`;

export function buildFollowUpExportFilename(meta: FollowUpExportMeta): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = slugify(meta.assessmentName || "follow-up");
  return `follow-up-questions-${base}-${date}.html`;
}

function questionBadgeClass(q: FollowUpQuestionItem): string {
  return q.source === "custom" ? "phase-custom" : "phase-recommended";
}

function questionBadgeLabel(q: FollowUpQuestionItem): string {
  if (q.source === "custom") return "Custom";
  if (q.source === "workshop" && q.phaseLabel) return q.phaseLabel;
  if (q.source === "probe") return "Probe";
  return "Recommended";
}

function renderFollowUpQuestion(q: FollowUpQuestionItem, index: number): string {
  return `<article class="question-card">
    <div class="question-head">
      <span class="question-num">${index + 1}</span>
      <span class="phase-badge ${questionBadgeClass(q)}">${escapeHtml(questionBadgeLabel(q))}</span>
    </div>
    <p class="question-prompt">${escapeHtml(q.text)}</p>
  </article>`;
}

function renderControlBlock(entry: ControlFollowUpEntry, controlAnchor: string): string {
  const questions = [...entry.standardQuestions, ...entry.customQuestions];
  if (questions.length === 0) {
    return `<section class="topic-block control-block" id="${controlAnchor}">
      <header class="topic-header">
        <h3><span class="control-code">${escapeHtml(entry.controlCode)}</span>${escapeHtml(entry.controlTitle)}</h3>
        ${entry.ownerRole ? `<p class="topic-desc">Suggested owner: ${escapeHtml(entry.ownerRole)}</p>` : ""}
        <p class="topic-meta">No follow-up questions recorded</p>
      </header>
    </section>`;
  }

  const cards = questions.map((q, i) => renderFollowUpQuestion(q, i)).join("\n");

  return `<section class="topic-block control-block" id="${controlAnchor}">
    <header class="topic-header">
      <h3><span class="control-code">${escapeHtml(entry.controlCode)}</span>${escapeHtml(entry.controlTitle)}</h3>
      ${entry.ownerRole ? `<p class="topic-desc">Suggested owner: ${escapeHtml(entry.ownerRole)}</p>` : ""}
      <p class="topic-meta">${questions.length} question${questions.length !== 1 ? "s" : ""} · Not assessed</p>
    </header>
    <div class="questions">${cards}</div>
  </section>`;
}

function groupByPillar(entries: ControlFollowUpEntry[]): Array<{
  pillarId: string;
  pillarLabel: string;
  entries: ControlFollowUpEntry[];
}> {
  const map = new Map<string, ControlFollowUpEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.pillarId) ?? [];
    list.push(entry);
    map.set(entry.pillarId, list);
  }
  return [...map.entries()].map(([pillarId, pillarEntries]) => ({
    pillarId,
    pillarLabel: pillarEntries[0]!.pillarLabel,
    entries: pillarEntries.sort((a, b) => a.controlCode.localeCompare(b.controlCode)),
  }));
}

function countQuestions(pack: FollowUpPack): number {
  return pack.entries.reduce(
    (n, e) => n + e.standardQuestions.length + e.customQuestions.length,
    0
  );
}

function renderPillarSection(group: {
  pillarId: string;
  pillarLabel: string;
  entries: ControlFollowUpEntry[];
}): string {
  const pillarId = slugify(group.pillarId);
  const controlToc = group.entries
    .map((e) => {
      const anchor = `${pillarId}-${slugify(e.controlCode)}`;
      const qCount = e.standardQuestions.length + e.customQuestions.length;
      return `<li><a href="#${anchor}"><span class="control-code">${escapeHtml(e.controlCode)}</span> ${escapeHtml(e.controlTitle)} <span class="toc-count">${qCount}</span></a></li>`;
    })
    .join("");

  const controls = group.entries
    .map((e) => renderControlBlock(e, `${pillarId}-${slugify(e.controlCode)}`))
    .join("\n");

  const questionTotal = group.entries.reduce(
    (n, e) => n + e.standardQuestions.length + e.customQuestions.length,
    0
  );

  return `<section class="pillar-section" id="pillar-${pillarId}">
    <header class="pillar-header">
      <p class="pillar-eyebrow">Risk pillar</p>
      <h2>${escapeHtml(group.pillarLabel)}</h2>
      <div class="pillar-stats">
        <span>${group.entries.length} control${group.entries.length !== 1 ? "s" : ""}</span>
        <span>${questionTotal} questions</span>
      </div>
    </header>
    <nav class="topic-toc" aria-label="Controls in ${escapeHtml(group.pillarLabel)}">
      <p class="toc-label">Controls in this pillar</p>
      <ul>${controlToc}</ul>
    </nav>
    ${controls}
  </section>`;
}

export function buildFollowUpQuestionsHtml(
  pack: FollowUpPack,
  meta: FollowUpExportMeta
): string {
  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const scopeLabel = meta.scopeLabel ?? "Assessment-wide";
  const pillarGroups = groupByPillar(pack.entries);
  const totalQuestions = countQuestions(pack);

  const tocItems = pillarGroups
    .map((g) => {
      const qCount = g.entries.reduce(
        (n, e) => n + e.standardQuestions.length + e.customQuestions.length,
        0
      );
      return `<li><a href="#pillar-${slugify(g.pillarId)}">${escapeHtml(g.pillarLabel)} <span class="toc-count">${g.entries.length} · ${qCount}q</span></a></li>`;
    })
    .join("");

  const bodyContent = pillarGroups.map(renderPillarSection).join("\n");

  const clientLine = meta.clientName
    ? `<div class="cover-stat"><span class="cover-stat-label">Prepared for</span><span class="cover-stat-value">${escapeHtml(meta.clientName)}</span></div>`
    : "";

  const emptyState =
    pack.entries.length === 0
      ? `<section class="intro">
          <h2>No follow-up questions</h2>
          <p>All in-scope controls have been assessed, or none are currently marked not assessed.</p>
        </section>`
      : bodyContent;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Follow-up questions — ${escapeHtml(meta.assessmentName)}</title>
  <style>${WORKSHOP_EXPORT_STYLES}${FOLLOW_UP_EXTRA_STYLES}</style>
</head>
<body>
  <div class="doc">
    <header class="cover">
      <p class="cover-eyebrow">Follow-up session guide</p>
      <h1>Follow-up questions</h1>
      <p class="cover-subtitle">Recommended and custom questions for controls marked not assessed — use in a follow-up workshop or client questionnaire, then upload responses and re-run analysis.</p>
      <div class="cover-grid">
        <div class="cover-stat"><span class="cover-stat-label">Assessment</span><span class="cover-stat-value">${escapeHtml(meta.assessmentName)}</span></div>
        ${clientLine}
        <div class="cover-stat"><span class="cover-stat-label">Scope</span><span class="cover-stat-value">${escapeHtml(scopeLabel)}</span></div>
        <div class="cover-stat"><span class="cover-stat-label">Controls</span><span class="cover-stat-value">${pack.coverageGapCount}</span></div>
        <div class="cover-stat"><span class="cover-stat-label">Questions</span><span class="cover-stat-value">${totalQuestions}</span></div>
        <div class="cover-stat"><span class="cover-stat-label">Generated</span><span class="cover-stat-value">${escapeHtml(generated)}</span></div>
      </div>
    </header>

    <section class="intro">
      <h2>How to use this document</h2>
      <p>This guide lists follow-up questions for controls that could not be assessed from uploaded workshop materials.</p>
      <ul>
        <li>Questions are grouped by risk pillar and control code, matching your workshop walkthrough structure.</li>
        <li><strong>Recommended</strong> questions come from the facilitation guide; <strong>Custom</strong> questions were added for this engagement.</li>
        <li>Capture responses in a follow-up session or async questionnaire, then upload to Evidence &amp; Analysis and re-run governance analysis.</li>
      </ul>
    </section>

    ${
      pack.entries.length > 0
        ? `<nav class="toc" aria-label="Table of contents">
      <h2>Contents</h2>
      <ul>${tocItems}</ul>
    </nav>`
        : ""
    }

    ${emptyState}

    <footer class="doc-footer">
      <p>Confidential — prepared for ${escapeHtml(meta.clientName ?? meta.assessmentName)} · ${escapeHtml(generated)}</p>
      <p>AI Governance Follow-up · ${escapeHtml(scopeLabel)}</p>
    </footer>
  </div>
</body>
</html>`;
}
