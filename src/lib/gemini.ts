const GEMINI_STREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface GeminiConfig {
  temperature: number;
  maxOutputTokens: number;
  // 0 = disable thinking (faster, cheaper, better for structured output)
  // omit = model default (up to 8000 thinking tokens)
  thinkingBudget?: number;
}

export async function geminiStream(
  prompt: string,
  config: GeminiConfig,
): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const { thinkingBudget, ...genConfig } = config;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      ...genConfig,
      ...(thinkingBudget !== undefined && {
        thinkingConfig: { thinkingBudget },
      }),
    },
  });

  const MAX_ATTEMPTS = 3;
  let lastRes: Response | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1_000 * 2 ** (attempt - 1)));
    }
    lastRes = await fetch(GEMINI_STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
    });
    if (lastRes.ok || (lastRes.status !== 429 && lastRes.status !== 503)) break;
  }

  return lastRes!;
}

/** Non-streaming Gemini call — returns full text or throws on failure. */
export async function geminiComplete(prompt: string, config: GeminiConfig): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const { thinkingBudget, ...genConfig } = config;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      ...genConfig,
      ...(thinkingBudget !== undefined && { thinkingConfig: { thinkingBudget } }),
    },
  });

  const MAX_ATTEMPTS = 3;
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1_000 * 2 ** (attempt - 1)));
    lastRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
    });
    if (lastRes.ok || (lastRes.status !== 429 && lastRes.status !== 503)) break;
  }

  if (!lastRes?.ok) throw new Error(`Gemini ${lastRes?.status}`);
  const json = await lastRes.json() as { candidates?: [{ content?: { parts?: { text?: string; thought?: boolean }[] } }] };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => !p.thought && p.text).map((p) => p.text!).join("");
}

// Extract only non-thought text tokens from a parsed Gemini SSE chunk.
// Gemini 2.5 Flash streams thinking tokens first (part.thought === true);
// filtering them ensures regexes only run on actual model output.
export function extractGeminiToken(json: unknown): string {
  const parts =
    (json as { candidates?: [{ content?: { parts?: { text?: string; thought?: boolean }[] } }] })
      ?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text!)
    .join("");
}
