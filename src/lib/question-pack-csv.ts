import {
  isRiskPillarId,
  resolvePackPillarId,
  type PackPillarSet,
  type PackQuestionInput,
} from "@/lib/pillar-questionnaire";
import { getPackPillarCatalog } from "@/lib/pack-pillar-catalog";
import { clampPackWeight, PACK_WEIGHT_DEFAULT } from "@/lib/pack-weights";

export const QUESTION_PACK_CSV_HEADERS = [
  "pillar_id",
  "question",
  "help_text",
  "sort_order",
  "weight",
] as const;

export function questionPackCsvTemplate(pillarSet: PackPillarSet = "standard_11"): string {
  if (pillarSet === "tmt_6") {
    return `${QUESTION_PACK_CSV_HEADERS.join(",")}
human-capital,"Do priority AI roles have defined skills and enablement paths?","Optional help text",1,3
regulatory-financial,"Are regulatory and financial impacts of AI products owned and reviewed?",,2,2
operational-risk,"Are AI operating processes resilient to incidents and service disruption?",,3,2
ecosystem-risk,"Are critical AI vendors and platform partners risk-assessed?",,4,1
technology-risk,"Are model, data, and platform technology risks owned end to end?",,5,3
compliance-risk,"Is AI policy adherence evidenced and audit-ready?",,6,2
`;
  }
  return `${QUESTION_PACK_CSV_HEADERS.join(",")}
governance,"Does the board oversee AI risk with a documented mandate?","Optional help text",1,2
privacy-data,"Is personal data used by AI systems inventoried and classified?",,2,1
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

export function parseQuestionPackCsv(
  text: string,
  pillarSet: PackPillarSet = "standard_11"
): {
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
  const weightIdx = header.findIndex((cell) => cell === "weight" || cell === "question_weight");

  if (pillarIdx < 0 || questionIdx < 0) {
    return {
      questions: [],
      errors: ["CSV must include pillar_id and question columns."],
    };
  }

  const questions: PackQuestionInput[] = [];
  const errors: string[] = [];
  const exampleId = getPackPillarCatalog(pillarSet)[0]?.id ?? "governance";

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitCsvLine(line);
    const pillarRaw = cells[pillarIdx] ?? "";
    const prompt = cells[questionIdx] ?? "";
    const pillarId = resolvePackPillarId(pillarRaw, pillarSet);

    if (!prompt) {
      errors.push(`Row ${rowNumber}: question is required.`);
      return;
    }
    if (!pillarId || !isRiskPillarId(pillarId, pillarSet)) {
      const hint =
        pillarSet === "tmt_6"
          ? `Use a TMT id (${getPackPillarCatalog("tmt_6")
              .map((pillar) => pillar.id)
              .join(", ")}) or a standard 11-pillar id (auto-mapped).`
          : `Use a pillar id such as ${exampleId}.`;
      errors.push(`Row ${rowNumber}: unknown pillar "${pillarRaw}". ${hint}`);
      return;
    }

    const sortRaw = sortIdx >= 0 ? cells[sortIdx] : "";
    const sortOrder = sortRaw ? Number.parseInt(sortRaw, 10) : index;
    const weightRaw = weightIdx >= 0 ? cells[weightIdx] : "";
    const weight = weightRaw
      ? clampPackWeight(Number.parseInt(weightRaw, 10), PACK_WEIGHT_DEFAULT)
      : PACK_WEIGHT_DEFAULT;
    questions.push({
      pillarId,
      prompt,
      helpText: helpIdx >= 0 ? cells[helpIdx] || null : null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
      weight,
      active: true,
    });
  });

  return { questions, errors };
}
