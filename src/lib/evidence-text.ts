import { readFileSync } from "fs";
import { readFile } from "fs/promises";

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
]);

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".log"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const DOC_EXTENSIONS = new Set([".doc"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MAX_TEXT_LENGTH = 100_000;

function extension(fileName: string): string {
  return fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";
}

function trimText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

async function extractPdfText(filePath: string): Promise<string | null> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return trimText(result.text);
  } catch {
    return null;
  }
}

async function extractDocxText(filePath: string): Promise<string | null> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return trimText(result.value);
  } catch {
    return null;
  }
}

async function extractImageTextWithVision(filePath: string, fileName: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const buffer = await readFile(filePath);
    const ext = extension(fileName).replace(".", "") || "jpeg";
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64 = buffer.toString("base64");
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all readable text from this workshop image (whiteboard notes, slide photo, scanned document). Return plain text only — no commentary.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return trimText(payload.choices?.[0]?.message?.content ?? null);
  } catch {
    return null;
  }
}

/** @deprecated Use extractTextFromFileAsync for uploads. */
export function extractTextFromFile(filePath: string, mimeType: string, fileName: string): string | null {
  const ext = extension(fileName);
  if (!TEXT_MIMES.has(mimeType) && !TEXT_EXTENSIONS.has(ext)) {
    return null;
  }
  try {
    return trimText(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export async function extractTextFromFileAsync(
  filePath: string,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  const ext = extension(fileName);

  if (TEXT_MIMES.has(mimeType) || TEXT_EXTENSIONS.has(ext)) {
    try {
      return trimText(readFileSync(filePath, "utf-8"));
    } catch {
      return null;
    }
  }

  if (mimeType === "application/pdf" || PDF_EXTENSIONS.has(ext)) {
    return extractPdfText(filePath);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    DOCX_EXTENSIONS.has(ext)
  ) {
    return extractDocxText(filePath);
  }

  if (mimeType === "application/msword" || DOC_EXTENSIONS.has(ext)) {
    return null;
  }

  if (IMAGE_MIMES.has(mimeType) || IMAGE_EXTENSIONS.has(ext)) {
    return extractImageTextWithVision(filePath, fileName);
  }

  return null;
}

export const SUPPORTED_CAPTURE_ACCEPT =
  ".pdf,.txt,.doc,.docx,.jpeg,.jpg,.png,.webp,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";

export const SUPPORTED_CAPTURE_LABEL = "PDF, TXT, Word (.docx), JPEG/PNG";
