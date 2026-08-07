export type NotesEntryTag = "COMPLIANT" | "PARTIAL" | "GAP";

export type WorkshopNotesEntry = {
  question: string;
  answer: string;
  tag?: NotesEntryTag;
};

export type WorkshopNotesSection = {
  id: string;
  pillarLabel?: string;
  topicLabel?: string;
  preamble?: string;
  entries: WorkshopNotesEntry[];
};

export type ParsedWorkshopNotes = {
  title?: string;
  intro?: string;
  sections: WorkshopNotesSection[];
  hasStructure: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function parseTag(answerLine: string): { tag?: NotesEntryTag; answer: string } {
  const match = answerLine.match(/^A(?:\s*\[(COMPLIANT|PARTIAL|GAP)\])?\s*:\s*(.*)$/i);
  if (!match) return { answer: answerLine };
  const tag = match[1]?.toUpperCase() as NotesEntryTag | undefined;
  return { tag, answer: match[2]?.trim() ?? "" };
}

function parseSectionBody(body: string): { preamble?: string; entries: WorkshopNotesEntry[] } {
  const lines = body.split("\n");
  const entries: WorkshopNotesEntry[] = [];
  const preambleLines: string[] = [];
  let currentQ: string | null = null;
  let currentA: string[] = [];
  let currentTag: NotesEntryTag | undefined;

  function flushEntry() {
    if (currentQ && currentA.length > 0) {
      entries.push({
        question: currentQ,
        answer: currentA.join(" ").trim(),
        tag: currentTag,
      });
    }
    currentQ = null;
    currentA = [];
    currentTag = undefined;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "---") continue;

    if (/^Q:\s*/i.test(line)) {
      flushEntry();
      currentQ = line.replace(/^Q:\s*/i, "").trim();
      continue;
    }

    if (/^A(?:\s*\[(COMPLIANT|PARTIAL|GAP)\])?\s*:/i.test(line)) {
      const parsed = parseTag(line);
      currentTag = parsed.tag;
      if (parsed.answer) currentA.push(parsed.answer);
      continue;
    }

    if (currentQ) {
      currentA.push(line);
    } else if (entries.length === 0) {
      preambleLines.push(line);
    }
  }
  flushEntry();

  const preamble = preambleLines.join("\n").trim();
  return {
    preamble: preamble || undefined,
    entries,
  };
}

/** Parse structured workshop transcript (## pillars, ### topics, Q:/A: pairs). */
export function parseWorkshopNotes(raw: string): ParsedWorkshopNotes {
  const text = raw.trim();
  if (!text) {
    return { sections: [], hasStructure: false };
  }

  let title: string | undefined;
  let intro: string | undefined;
  const lines = text.split("\n");
  let startIdx = 0;

  if (lines[0]?.startsWith("# ")) {
    title = lines[0].replace(/^#\s+/, "").trim();
    startIdx = 1;
  }

  const body = lines.slice(startIdx).join("\n");
  const sectionChunks = body.split(/\n(?=##\s+)/);

  const sections: WorkshopNotesSection[] = [];
  let introLines: string[] = [];

  for (const chunk of sectionChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    if (!trimmed.startsWith("##")) {
      introLines = trimmed.split("\n");
      continue;
    }

    const sectionLines = trimmed.split("\n");
    const headerLine = sectionLines[0] ?? "";
    const isTopic = headerLine.startsWith("###");
    const headerText = headerLine.replace(/^#+\s+/, "").trim();

    const subChunks = sectionLines.slice(1).join("\n").split(/\n(?=###\s+)/);

    if (isTopic) {
      const { preamble, entries } = parseSectionBody(subChunks[0] ?? "");
      sections.push({
        id: slugify(headerText),
        topicLabel: headerText,
        preamble,
        entries,
      });
      continue;
    }

    const pillarLabel = headerText;
    const remainder = sectionLines.slice(1).join("\n");
    const topicChunks = remainder.split(/\n(?=###\s+)/);

    if (topicChunks.length === 1 && !topicChunks[0]?.trim().startsWith("###")) {
      const { preamble, entries } = parseSectionBody(remainder);
      if (entries.length > 0 || preamble) {
        sections.push({
          id: slugify(pillarLabel),
          pillarLabel,
          preamble,
          entries,
        });
      }
      continue;
    }

    for (const topicChunk of topicChunks) {
      const t = topicChunk.trim();
      if (!t) continue;
      if (t.startsWith("###")) {
        const tLines = t.split("\n");
        const topicLabel = (tLines[0] ?? "").replace(/^###\s+/, "").trim();
        const { preamble, entries } = parseSectionBody(tLines.slice(1).join("\n"));
        sections.push({
          id: slugify(`${pillarLabel}-${topicLabel}`),
          pillarLabel,
          topicLabel,
          preamble,
          entries,
        });
      } else {
        const { preamble, entries } = parseSectionBody(t);
        if (entries.length > 0) {
          sections.push({
            id: slugify(`${pillarLabel}-general`),
            pillarLabel,
            preamble,
            entries,
          });
        }
      }
    }
  }

  intro = introLines.join("\n").trim() || undefined;
  const hasStructure = sections.some((s) => s.entries.length > 0);

  return { title, intro, sections, hasStructure };
}

export function countWorkshopEntries(parsed: ParsedWorkshopNotes): number {
  return parsed.sections.reduce((n, s) => n + s.entries.length, 0);
}

export const NOTES_TAG_STYLES: Record<
  NotesEntryTag,
  { label: string; className: string }
> = {
  COMPLIANT: {
    label: "Compliant",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  PARTIAL: {
    label: "Partial",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  GAP: {
    label: "Gap",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
};
