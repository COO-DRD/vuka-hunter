import type { ModeConfig } from "./enrichmentModes";

export interface ContactCandidate {
  name:        string;
  title:       string;
  source:      "about_page" | "instagram_bio";
  confidence:  "high" | "medium" | "low";
  email?:      string;
  phone?:      string;
  raw_snippet: string;
}

// Strip HTML tags and collapse whitespace — gives Gemini clean text to parse
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .slice(0, 4000)   // cap to keep Gemini call cheap
    .trim();
}

async function geminiExtract(prompt: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body:    JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:       0,
            maxOutputTokens:   512,
            thinkingConfig:    { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch { return null; }
}

export async function extractContactsFromAboutPage(
  html: string,
  mode: ModeConfig,
  verticalTitles?: string[],
): Promise<ContactCandidate[]> {
  if (!html || html.length < 200) return [];

  const text = htmlToText(html);
  const allTitles = [...new Set([...(verticalTitles ?? []), ...mode.targetTitles])];
  const titlesHint = allTitles.join(", ");

  const prompt = `Extract named people from this webpage text. Focus on: ${titlesHint}.
Only include people explicitly named. Ignore generic "our team" phrases with no names.
Return a JSON array — nothing else, no markdown:
[{"name":"...","title":"...","email":"...or null","phone":"...or null"}]
If no named people found, return [].

PAGE TEXT:
${text}`;

  const result = await geminiExtract(prompt) as Array<Record<string, string>> | null;
  if (!Array.isArray(result)) return [];

  return result
    .filter((r) => typeof r.name === "string" && r.name.trim().length > 1)
    .map((r) => ({
      name:        r.name.trim(),
      title:       (r.title ?? "").trim(),
      source:      "about_page" as const,
      confidence:  r.title ? "high" : "medium",
      email:       r.email && r.email !== "null" ? r.email.trim() : undefined,
      phone:       r.phone && r.phone !== "null" ? r.phone.trim() : undefined,
      raw_snippet: text.slice(0, 200),
    }));
}

export async function extractContactsFromInstagramBio(
  bio: string,
  mode: ModeConfig,
  verticalTitles?: string[],
): Promise<ContactCandidate[]> {
  if (!bio || bio.length < 10) return [];

  const allTitles = [...new Set([...(verticalTitles ?? []), ...mode.targetTitles])];
  const titlesHint = allTitles.join(", ");
  const prompt = `Extract a named person from this Instagram business bio if present. Focus on: ${titlesHint}.
Return a JSON array — nothing else, no markdown:
[{"name":"...","title":"...","phone":"...or null"}]
If no named person found, return [].

BIO: ${bio.slice(0, 400)}`;

  const result = await geminiExtract(prompt) as Array<Record<string, string>> | null;
  if (!Array.isArray(result)) return [];

  return result
    .filter((r) => typeof r.name === "string" && r.name.trim().length > 1)
    .map((r) => ({
      name:        r.name.trim(),
      title:       (r.title ?? "").trim(),
      source:      "instagram_bio" as const,
      confidence:  "medium" as const,
      phone:       r.phone && r.phone !== "null" ? r.phone.trim() : undefined,
      raw_snippet: bio.slice(0, 200),
    }));
}

// Merge contacts from multiple sources — deduplicate by name (case-insensitive)
// and upgrade confidence when the same name appears in 2+ sources
export function mergeContacts(
  ...groups: ContactCandidate[][]
): ContactCandidate[] {
  const map = new Map<string, ContactCandidate & { _sources: number }>();

  for (const group of groups) {
    for (const c of group) {
      const key = c.name.toLowerCase().replace(/\s+/g, " ");
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...c, _sources: 1 });
      } else {
        // Merge — keep best data, increment source count
        existing._sources += 1;
        if (!existing.email && c.email)  existing.email  = c.email;
        if (!existing.phone && c.phone)  existing.phone  = c.phone;
        if (!existing.title && c.title)  existing.title  = c.title;
        if (existing._sources >= 2)      existing.confidence = "high";
        if (existing._sources >= 3)      existing.confidence = "high"; // "verified" upgrade later
      }
    }
  }

  return [...map.values()].map(({ _sources: _, ...c }) => c);
}
