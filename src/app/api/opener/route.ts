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

  const pains = (lead.pain_signals as string[])?.join(", ") ?? "";
  const tech  = (lead.tech_stack as string[])?.join(", ") ?? "";

  const prompt = `Write a short personalized cold outreach message for a local business.

Sender: A digital growth agency that builds AI automation, booking systems, and websites.
Recipient: ${lead.name} — a ${lead.vertical} in ${lead.city}
Google rating: ${lead.google_rating ?? "N/A"} (${lead.google_review_count ?? 0} reviews)
Website: ${lead.website ?? "none"}
Tech stack: ${tech || "unknown"}
Pain signals: ${pains || "none detected"}
Has booking system: ${lead.has_booking_system ?? "unknown"}

Rules:
- 3–5 sentences max
- Mention 1 specific thing about their business
- One clear value prop: save time, get more bookings, look more professional
- End with a soft CTA: "Worth a quick chat?" or "Open to a 15-min call?"
- No fluff, no "I hope this finds you well"
- Write only the message body, no subject line or sign-off`;

  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
    }),
  });

  const data = await res.json();
  const opener = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!opener) return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });

  await db.from("hunter_leads").update({
    opener_text: opener,
    opener_generated_at: new Date().toISOString(),
  }).eq("id", leadId);

  return NextResponse.json({ ok: true, opener });
}
