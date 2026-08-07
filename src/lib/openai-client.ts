export type OpenAIJsonResult<T> =
  | { ok: true; data: T; model: string }
  | { ok: false; error: string };

export async function callOpenAIJson<T>(options: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenAIJsonResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 16_000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `OpenAI API error (${res.status}): ${errText.slice(0, 500)}` };
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "Empty response from OpenAI" };
    }

    const data = JSON.parse(content) as T;
    return { ok: true, data, model };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "OpenAI request failed",
    };
  }
}
