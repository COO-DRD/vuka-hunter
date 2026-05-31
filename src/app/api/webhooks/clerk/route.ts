import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const db = createSupabaseServiceClient();

  if (evt.type === "user.created") {
    const { id: clerkUserId, email_addresses } = evt.data;
    const email = email_addresses?.[0]?.email_address ?? "";

    // Idempotent: skip if already exists (can happen on webhook retries)
    const { data: existing } = await db
      .from("hunter_orgs")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    if (!existing) {
      const orgId = crypto.randomUUID();
      await db.from("hunter_orgs").insert({
        id:               orgId,
        clerk_id:         clerkUserId,
        name:             email.split("@")[0],
        trial_started_at: new Date().toISOString(),
        trial_ends_at:    new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    }
  }

  if (evt.type === "user.deleted") {
    const { id: clerkUserId } = evt.data;
    if (clerkUserId) {
      await db
        .from("hunter_orgs")
        .update({ subscription_status: "cancelled" })
        .eq("clerk_id", clerkUserId);
    }
  }

  return new Response("OK", { status: 200 });
}
