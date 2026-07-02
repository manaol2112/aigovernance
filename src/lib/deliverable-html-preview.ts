import { escapeHtml } from "@/lib/workshop-questions-export";

const DELIVERABLE_PREVIEW_STYLES = `
  :root {
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --surface: #f8fafc;
    --brand: #4f46e5;
    --brand-dark: #3730a3;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--ink);
    background: #eef2f7;
    line-height: 1.6;
    font-size: 15px;
  }
  .doc { max-width: 920px; margin: 0 auto; padding: 24px 20px 64px; }
  .cover {
    margin-bottom: 32px;
    padding: 48px 40px 40px;
    background: linear-gradient(145deg, #1e1b4b 0%, #4f46e5 48%, #6366f1 100%);
    color: #fff;
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(79, 70, 229, 0.25);
  }
  .cover-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.85;
    margin: 0 0 10px;
  }
  .cover h1 {
    margin: 0 0 10px;
    font-size: clamp(1.65rem, 4vw, 2.25rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .cover-subtitle { margin: 0; opacity: 0.9; font-size: 0.98rem; }
  .cover-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-top: 28px;
  }
  .cover-stat {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .cover-stat-label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.75;
    margin-bottom: 4px;
  }
  .cover-stat-value { font-size: 1rem; font-weight: 600; }
  .preview-note {
    margin-bottom: 20px;
    padding: 12px 16px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid var(--line);
    font-size: 0.85rem;
    color: var(--muted);
  }
  .report-content {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 36px 40px 48px;
    box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
  }
  .report-content h1 {
    font-size: 1.65rem;
    margin: 0 0 16px;
    color: var(--ink);
    letter-spacing: -0.02em;
  }
  .report-content h2 {
    font-size: 1.2rem;
    margin: 32px 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--line);
    color: #1e293b;
  }
  .report-content h3 {
    font-size: 1.05rem;
    margin: 24px 0 10px;
    color: #334155;
  }
  .report-content p {
    margin: 0 0 14px;
    color: #334155;
  }
  .report-content ul, .report-content ol {
    margin: 0 0 16px;
    padding-left: 1.35rem;
    color: #334155;
  }
  .report-content li { margin-bottom: 6px; }
  .report-content hr {
    border: none;
    border-top: 1px solid var(--line);
    margin: 28px 0;
  }
  .report-content blockquote {
    margin: 16px 0;
    padding: 14px 18px;
    border-left: 4px solid var(--brand);
    background: #eef2ff;
    border-radius: 0 12px 12px 0;
    color: #3730a3;
  }
  .report-content blockquote p { margin: 0; }
  .report-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.88em;
    background: var(--surface);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .report-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 0.92rem;
  }
  .report-content th,
  .report-content td {
    border: 1px solid var(--line);
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
  }
  .report-content th {
    background: var(--surface);
    font-weight: 600;
    color: var(--ink);
  }
  .report-content tr:nth-child(even) td { background: #fafbfc; }
  .report-content em { color: var(--muted); font-size: 0.92rem; }
  @media print {
    body { background: #fff; }
    .doc { padding: 0; max-width: none; }
    .cover { border-radius: 0; box-shadow: none; }
    .preview-note { display: none; }
    .report-content { border: none; box-shadow: none; border-radius: 0; padding: 24px 0; }
  }
`;

type ParsedMeta = {
  title: string;
  subtitle: string;
  stats: Array<{ label: string; value: string }>;
  bodyMarkdown: string;
};

function parseMetaLine(line: string): { label: string; value: string } | null {
  const match = line.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
  if (!match) return null;
  return { label: match[1].trim(), value: match[2].trim() };
}

function parseDeliverableMarkdown(markdown: string): ParsedMeta {
  const lines = markdown.split("\n");
  let title = "Deliverable Report";
  let subtitle = "";
  const stats: Array<{ label: string; value: string }> = [];
  const bodyLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      i++;
      continue;
    }
    const meta = parseMetaLine(line.trim());
    if (meta) {
      stats.push(meta);
      if (meta.label.toLowerCase() === "client" || meta.label.toLowerCase() === "organization") {
        subtitle = meta.value;
      }
      i++;
      continue;
    }
    if (!line.trim() && stats.length > 0 && bodyLines.length === 0) {
      i++;
      continue;
    }
    break;
  }

  while (i < lines.length) {
    bodyLines.push(lines[i]);
    i++;
  }

  return {
    title,
    subtitle,
    stats,
    bodyMarkdown: bodyLines.join("\n").trim(),
  };
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.includes("|");
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const [header, ...body] = rows;
  const headHtml = header.map((c) => `<th>${inlineMarkdown(c)}</th>`).join("");
  const bodyHtml = body
    .map((row) => `<tr>${row.map((c) => `<td>${inlineMarkdown(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

/** Markdown → HTML for deliverable preview (headings, lists, tables, blockquotes). */
export function markdownToPreviewHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    if (isTableRow(trimmed)) {
      closeLists();
      const tableRows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        const rowLine = lines[i].trim();
        if (!isTableSeparator(rowLine)) {
          tableRows.push(parseTableRow(rowLine));
        }
        i++;
      }
      i--;
      if (tableRows.length > 0) {
        out.push(renderTable(tableRows));
      }
      continue;
    }

    if (trimmed === "---") {
      closeLists();
      out.push("<hr />");
      continue;
    }

    if (trimmed.startsWith("> ")) {
      closeLists();
      out.push(`<blockquote><p>${inlineMarkdown(trimmed.slice(2))}</p></blockquote>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      closeLists();
      out.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeLists();
      out.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      closeLists();
      out.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inUl) {
        closeLists();
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOl) {
        closeLists();
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineMarkdown(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
      closeLists();
      out.push(`<p><em>${inlineMarkdown(trimmed.slice(1, -1))}</em></p>`);
      continue;
    }

    closeLists();
    out.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }

  closeLists();
  return out.join("\n");
}

export function buildDeliverableHtmlDocument(title: string, markdownContent: string): string {
  const parsed = parseDeliverableMarkdown(markdownContent);
  const displayTitle = parsed.title || title;
  const bodyHtml = markdownToPreviewHtml(parsed.bodyMarkdown || markdownContent);
  const generated = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const statsHtml =
    parsed.stats.length > 0
      ? `<div class="cover-grid">${parsed.stats
          .slice(0, 6)
          .map(
            (s) =>
              `<div class="cover-stat"><span class="cover-stat-label">${escapeHtml(s.label)}</span><span class="cover-stat-value">${escapeHtml(s.value)}</span></div>`
          )
          .join("")}</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(displayTitle)}</title>
  <style>${DELIVERABLE_PREVIEW_STYLES}</style>
</head>
<body>
  <div class="doc">
    <header class="cover">
      <p class="cover-eyebrow">AI Governance Deliverable</p>
      <h1>${escapeHtml(displayTitle)}</h1>
      ${parsed.subtitle ? `<p class="cover-subtitle">${escapeHtml(parsed.subtitle)}</p>` : ""}
      ${statsHtml}
    </header>
    <p class="preview-note">Preview generated ${escapeHtml(generated)} · Download PDF for formal client distribution.</p>
    <main class="report-content">
      ${bodyHtml}
    </main>
  </div>
</body>
</html>`;
}
