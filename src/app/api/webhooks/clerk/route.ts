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

  switch (evt.type) {
    // ── User lifecycle ────────────────────────────────────────────────
    case "user.created": {
      const { id: clerkUserId, email_addresses } = evt.data;
      const email = email_addresses?.[0]?.email_address ?? "";

      const { data: existing } = await db
        .from("hunter_orgs")
        .select("id")
        .eq("clerk_id", clerkUserId)
        .maybeSingle();

      if (!existing) {
        await db.from("hunter_orgs").insert({
          id:               crypto.randomUUID(),
          clerk_id:         clerkUserId,
          name:             email.split("@")[0],
          email,
          trial_started_at: new Date().toISOString(),
          trial_ends_at:    new Date(Date.now() + 7 * 86400000).toISOString(),
        });
      }
      break;
    }

    case "user.updated": {
      const { id: clerkUserId, email_addresses, first_name, last_name } = evt.data;
      const email = email_addresses?.[0]?.email_address ?? null;
      const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

      const patch: Record<string, string> = {};
      if (email)    patch.email = email;
      if (fullName) patch.name  = fullName;

      if (Object.keys(patch).length > 0) {
        await db.from("hunter_orgs").update(patch).eq("clerk_id", clerkUserId);
      }
      break;
    }

    case "user.deleted": {
      const { id: clerkUserId } = evt.data;
      if (clerkUserId) {
        await db
          .from("hunter_orgs")
          .update({ subscription_status: "cancelled" })
          .eq("clerk_id", clerkUserId);
      }
      break;
    }

    // ── Session events (product analytics) ───────────────────────────
    case "session.created": {
      const { user_id } = evt.data;
      await db
        .from("hunter_orgs")
        .update({ last_active_at: new Date().toISOString() })
        .eq("clerk_id", user_id);
      break;
    }

    // session.ended / session.removed / session.revoked — acknowledged,
    // no write needed until we build a security audit log
    case "session.ended":
    case "session.removed":
    case "session.revoked":
      break;

    // ── Email events ──────────────────────────────────────────────────
    // email.created fires when Clerk sends verification/magic-link emails.
    // Acknowledged only — useful for debugging delivery issues.
    case "email.created":
      break;

    // ── Organization events + Clerk Billing ─────────────────────────
    // We use a custom org system, not Clerk Orgs. Billing events are handled
    // here via string comparison because the SDK union type may lag behind
    // Clerk's event catalogue.
    default: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evtType = (evt as any).type as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data    = (evt as any).data ?? {};

      if (
        evtType === "billing.subscription.created" ||
        evtType === "billing.subscription.updated" ||
        evtType === "subscription.created" ||
        evtType === "subscription.updated"
      ) {
        const clerkUserId: string = data.subscriber_id ?? data.user_id ?? "";
        if (clerkUserId) {
          const planSlug: string = (data.plan?.slug ?? data.plan?.name ?? "").toLowerCase();
          const isTeam = planSlug === "team" || planSlug.includes("team");
          await db.from("hunter_orgs").update({
            subscription_status: data.status ?? "active",
            subscribed_plan:     planSlug || (isTeam ? "team" : "solo"),
            account_type:        isTeam ? "corporate" : "individual",
            seat_limit:          isTeam ? 10 : 1,
          }).eq("clerk_id", clerkUserId);
        }
      } else if (
        evtType === "billing.subscription.deleted" ||
        evtType === "subscription.deleted"
      ) {
        const clerkUserId: string = data.subscriber_id ?? data.user_id ?? "";
        if (clerkUserId) {
          await db.from("hunter_orgs").update({ subscription_status: "cancelled" }).eq("clerk_id", clerkUserId);
        }
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
