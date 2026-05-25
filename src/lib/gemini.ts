const GEMINI_STREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

interface GeminiConfig {
  temperature: number;
  maxOutputTokens: number;
}

// Fetch Gemini SSE with exponential backoff on 429/503
export async function geminiStream(
  prompt: string,
  config: GeminiConfig,
): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: config,
  });

  const MAX_ATTEMPTS = 3;
  let lastRes: Response | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1_000 * 2 ** (attempt - 1)));
    }
    lastRes = await fetch(`${GEMINI_STREAM_URL}&key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (lastRes.ok || (lastRes.status !== 429 && lastRes.status !== 503)) break;
  }

  return lastRes!;
}
