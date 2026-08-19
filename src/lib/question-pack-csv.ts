import {
  isRiskPillarId,
  resolvePackPillarId,
  type PackQuestionInput,
} from "@/lib/pillar-questionnaire";

export const QUESTION_PACK_CSV_HEADERS = ["pillar_id", "question", "help_text", "sort_order"] as const;

export function questionPackCsvTemplate(): string {
  return `${QUESTION_PACK_CSV_HEADERS.join(",")}
governance,"Does the board oversee AI risk with a documented mandate?","Optional help text",1
privacy-data,"Is personal data used by AI systems inventoried and classified?",,2
`;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

export function parseQuestionPackCsv(text: string): {
  questions: PackQuestionInput[];
  errors: string[];
} {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { questions: [], errors: ["CSV is empty."] };
  }

  const header = splitCsvLine(lines[0]!).map((cell) => cell.toLowerCase().replace(/\s+/g, "_"));
  const pillarIdx = header.findIndex((cell) => cell === "pillar_id" || cell === "pillar");
  const questionIdx = header.findIndex((cell) => cell === "question" || cell === "prompt");
  const helpIdx = header.findIndex((cell) => cell === "help_text" || cell === "help");
  const sortIdx = header.findIndex((cell) => cell === "sort_order" || cell === "order");

  if (pillarIdx < 0 || questionIdx < 0) {
    return {
      questions: [],
      errors: ["CSV must include pillar_id and question columns."],
    };
  }

  const questions: PackQuestionInput[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitCsvLine(line);
    const pillarRaw = cells[pillarIdx] ?? "";
    const prompt = cells[questionIdx] ?? "";
    const pillarId = resolvePackPillarId(pillarRaw);

    if (!prompt) {
      errors.push(`Row ${rowNumber}: question is required.`);
      return;
    }
    if (!pillarId || !isRiskPillarId(pillarId)) {
      errors.push(`Row ${rowNumber}: unknown pillar "${pillarRaw}". Use a pillar id such as governance.`);
      return;
    }

    const sortRaw = sortIdx >= 0 ? cells[sortIdx] : "";
    const sortOrder = sortRaw ? Number.parseInt(sortRaw, 10) : index;
    questions.push({
      pillarId,
      prompt,
      helpText: helpIdx >= 0 ? cells[helpIdx] || null : null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
      active: true,
    });
  });

  return { questions, errors };
}
