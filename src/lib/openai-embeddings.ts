const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (texts.length === 0) return [];

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 8_000)),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const payload = (await res.json()) as {
    data?: Array<{ embedding: number[]; index: number }>;
  };

  const rows = payload.data ?? [];
  rows.sort((a, b) => a.index - b.index);
  return rows.map((r) => r.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
