export const WORKPAPER_FIELDS = [
  "inPlaceFindings",
  "gapFindings",
  "recommendations",
  "complianceStatus",
  "documentationValidation",
  "overallConclusion",
] as const;

export type WorkpaperFieldKey = (typeof WORKPAPER_FIELDS)[number];

export type WorkpaperFieldDecision = "pending" | "changes_requested" | "approved";

export type WorkpaperContentRecord = Record<WorkpaperFieldKey, string>;

export type WorkpaperFieldStateRecord = Partial<
  Record<
    WorkpaperFieldKey,
    {
      decision: WorkpaperFieldDecision;
      updatedAt?: string;
      updatedBy?: string | null;
    }
  >
>;

export type WorkpaperThreadMessage = {
  id: string;
  kind: "comment" | "system";
  body: string;
  author: string;
  createdAt: string;
  quotedText?: string;
  highlightId?: string;
};

export type WorkpaperReviewNoteThread = {
  id: string;
  fieldKey: WorkpaperFieldKey;
  title: string | null;
  status: "open" | "resolved" | "reopened";
  assignee: string | null;
  createdBy: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  messages: WorkpaperThreadMessage[];
  createdAt: string;
  updatedAt: string;
};

export function getWorkpaperFieldLabel(field: WorkpaperFieldKey): string {
  switch (field) {
    case "inPlaceFindings":
      return "In place";
    case "gapFindings":
      return "Gaps";
    case "recommendations":
      return "Recommendations";
    case "complianceStatus":
      return "Compliance conclusion";
    case "documentationValidation":
      return "Documentation completeness";
    case "overallConclusion":
      return "Reviewer conclusion";
    default:
      return field;
  }
}

export function emptyWorkpaperContent(): WorkpaperContentRecord {
  return {
    inPlaceFindings: "",
    gapFindings: "",
    recommendations: "",
    complianceStatus: "",
    documentationValidation: "",
    overallConclusion: "",
  };
}

export function normalizeWorkpaperContent(input: unknown): WorkpaperContentRecord {
  const base = emptyWorkpaperContent();
  if (!input || typeof input !== "object") return base;
  const record = input as Partial<Record<WorkpaperFieldKey, unknown>>;
  for (const key of WORKPAPER_FIELDS) {
    const value = record[key];
    if (typeof value === "string") base[key] = value;
  }
  return base;
}

export function normalizeWorkpaperFieldState(input: unknown): WorkpaperFieldStateRecord {
  if (!input || typeof input !== "object") return {};
  return input as WorkpaperFieldStateRecord;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function plainTextToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const paragraphs = trimmed.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function htmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  return html
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildInitialWorkpaperContent(input: {
  inPlaceFindings?: string | null;
  gapFindings?: string | null;
  recommendations?: string | null;
  complianceStatus?: string | null;
  documentationSummary?: string | null;
  overallConclusion?: string | null;
}): WorkpaperContentRecord {
  return {
    inPlaceFindings: plainTextToHtml(input.inPlaceFindings ?? ""),
    gapFindings: plainTextToHtml(input.gapFindings ?? ""),
    recommendations: plainTextToHtml(input.recommendations ?? ""),
    complianceStatus: plainTextToHtml(input.complianceStatus ?? ""),
    documentationValidation: plainTextToHtml(input.documentationSummary ?? ""),
    overallConclusion: plainTextToHtml(input.overallConclusion ?? ""),
  };
}

export function createThreadMessage(input: {
  author: string;
  body: string;
  kind?: "comment" | "system";
  quotedText?: string;
  highlightId?: string;
}): WorkpaperThreadMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 10)}`,
    kind: input.kind ?? "comment",
    body: input.body.trim(),
    author: input.author.trim(),
    createdAt: new Date().toISOString(),
    quotedText: input.quotedText?.trim() || undefined,
    highlightId: input.highlightId?.trim() || undefined,
  };
}

export function countOpenThreads(
  threads: WorkpaperReviewNoteThread[],
  fieldKey?: WorkpaperFieldKey
): number {
  return threads.filter(
    (thread) =>
      thread.status !== "resolved" && (fieldKey ? thread.fieldKey === fieldKey : true)
  ).length;
}
