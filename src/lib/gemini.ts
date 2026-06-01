const GEMINI_STREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Each action has its own pool of up to 3 dedicated keys, with the global key as final fallback.
// Set GEMINI_SCORE_KEY_1, GEMINI_SCORE_KEY_2, GEMINI_SCORE_KEY_3 etc. in env.
// Any unset slots are skipped; GEMINI_API_KEY is always appended unless already present.
export type GeminiAction = "score" | "opener" | "enrich" | "sequence";

export interface GeminiConfig {
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget?: number;
  timeoutMs?: number;
}

export function getKeyPool(action?: GeminiAction): string[] {
  const keys: string[] = [];
  if (action) {
    const prefix = `GEMINI_${action.toUpperCase()}_KEY_`;
    for (let i = 1; i <= 4; i++) {
      const k = process.env[`${prefix}${i}`];
      if (k) keys.push(k);
    }
  }
  // Global pool: GEMINI_API_KEY, then GEMINI_API_KEY2..8 and GEMINI_API_KEY_2..8 (both styles)
  const global0 = process.env.GEMINI_API_KEY;
  if (global0) keys.push(global0);
  for (let i = 2; i <= 8; i++) {
    const a = process.env[`GEMINI_API_KEY${i}`];   // no-underscore: GEMINI_API_KEY2
    const b = process.env[`GEMINI_API_KEY_${i}`];  // underscored:   GEMINI_API_KEY_2
    if (a) keys.push(a);
    if (b) keys.push(b);
  }
  return [...new Set(keys)]; // dedupe — same key in multiple slots tried only once
}

function buildBody(prompt: string, config: GeminiConfig): string {
  const { thinkingBudget, timeoutMs: _ignored, ...genConfig } = config;
  return JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      ...genConfig,
      ...(thinkingBudget !== undefined && { thinkingConfig: { thinkingBudget } }),
    },
  });
}

async function doFetch(url: string, body: string, apiKey: string, timeoutMs?: number): Promise<Response> {
  return fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body,
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });
}

// Rotate through the pool on 429/503. Stop immediately on any other status (including 400).
// If every key returns 429/503 on the first pass, wait 2 s and try once more.
async function tryPool(url: string, body: string, pool: string[], timeoutMs?: number): Promise<Response> {
  let last: Response | null = null;
  for (let pass = 0; pass < 2; pass++) {
    if (pass > 0) await new Promise<void>(r => setTimeout(r, 2000));
    for (const key of pool) {
      last = await doFetch(url, body, key, timeoutMs);
      if (last.ok) return last;
      if (last.status !== 429 && last.status !== 503) return last; // non-rate-limit: stop rotating
      // 429/503 on this key — rotate to next
    }
  }
  return last!;
}

export async function geminiStream(
  prompt: string,
  config: GeminiConfig,
  action?: GeminiAction,
): Promise<Response> {
  return tryPool(GEMINI_STREAM_URL, buildBody(prompt, config), getKeyPool(action), config.timeoutMs);
}

export async function geminiComplete(
  prompt: string,
  config: GeminiConfig,
  action?: GeminiAction,
): Promise<string> {
  const res = await tryPool(GEMINI_URL, buildBody(prompt, config), getKeyPool(action), config.timeoutMs);
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json() as { candidates?: [{ content?: { parts?: { text?: string; thought?: boolean }[] } }] };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts.filter(p => !p.thought && p.text).map(p => p.text!).join("");
}

export function extractGeminiToken(json: unknown): string {
  const parts =
    (json as { candidates?: [{ content?: { parts?: { text?: string; thought?: boolean }[] } }] })
      ?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter(p => !p.thought && p.text).map(p => p.text!).join("");
}
