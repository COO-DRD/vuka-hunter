import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = createSupabaseServiceClient();
  const { data: lead } = await db.from("hunter_leads").select("*").eq("id", leadId).eq("org_id", user.id).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const prompt = `You are a B2B sales analyst scoring a local business lead for digital marketing / AI automation outreach.

Lead:
- Name: ${lead.name}
- Vertical: ${lead.vertical}
- City: ${lead.city}
- Google Rating: ${lead.google_rating ?? "unknown"} (${lead.google_review_count ?? 0} reviews)
- Website: ${lead.website ?? "none"}
- Has booking system: ${lead.has_booking_system ?? "unknown"}
- Has live chat: ${lead.has_live_chat ?? "unknown"}
- Tech stack: ${(lead.tech_stack as string[])?.join(", ") ?? "unknown"}
- Phone: ${lead.phone ? "yes" : "no"}
- Email found: ${lead.email ? "yes" : "no"}

Score 0–100 for outreach priority. High rating + many reviews = established. No booking system = clear pain. Old tech = room to improve. High contactability = bonus.

Respond ONLY in this JSON (no markdown):
{"score":<0-100>,"reasoning":"<2-3 sentences>","pain_signals":["<signal1>","<signal2>"]}`;

  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: { score: number; reasoning: string; pain_signals: string[] };
  try { parsed = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 }); }

  await db.from("hunter_leads").update({
    score: parsed.score,
    score_reasoning: parsed.reasoning,
    pain_signals: parsed.pain_signals,
    scored_at: new Date().toISOString(),
  }).eq("id", leadId);

  return NextResponse.json({ ok: true, ...parsed });
}
