/**
 * Read a CSV File as text while avoiding main-thread FileReader / file.text()
 * hooks that Prisma Access Browser crashes with:
 * "Cannot read properties of undefined (reading 'digest')".
 *
 * Prefer an isolated Worker (extensions usually don't inject there), then
 * arrayBuffer + TextDecoder, then blob: URL fetch.
 */

export function looksLikeCsvFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return true;
  return (
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/csv" ||
    file.type === "text/plain"
  );
}

function decodeUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(buffer);
}

function readViaWorker(file: File): Promise<string> {
  const workerSource = `
    self.onmessage = async (event) => {
      try {
        const file = event.data;
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder("utf-8").decode(buffer);
        self.postMessage({ ok: true, text });
      } catch (error) {
        self.postMessage({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
  `;

  return new Promise((resolve, reject) => {
    const blob = new Blob([workerSource], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out reading CSV in worker."));
    }, 15000);

    worker.onmessage = (event: MessageEvent<{ ok: boolean; text?: string; error?: string }>) => {
      window.clearTimeout(timer);
      cleanup();
      if (event.data?.ok && typeof event.data.text === "string") {
        resolve(event.data.text);
        return;
      }
      reject(new Error(event.data?.error || "Worker could not read that CSV."));
    };

    worker.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Worker failed while reading CSV."));
    };

    worker.postMessage(file);
  });
}

async function readViaArrayBuffer(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return decodeUtf8(buffer);
}

async function readViaBlobUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const response = await fetch(objectUrl);
    if (!response.ok) {
      throw new Error(`Could not read file (${response.status}).`);
    }
    return await response.text();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function readCsvFileAsText(file: File): Promise<string> {
  const attempts: Array<() => Promise<string>> = [
    () => readViaWorker(file),
    () => readViaArrayBuffer(file),
    () => readViaBlobUrl(file),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const text = await attempt();
      if (!text.trim()) {
        throw new Error("That CSV file is empty.");
      }
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not read that CSV. Open the file and paste it instead.");
}
