import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM = "4unter <noreply@4unter.dullugroup.co.ke>";

export async function addToResendAudience(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<void> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return;
  try {
    await getResend().contacts.create({
      audienceId,
      email,
      firstName: firstName ?? undefined,
      lastName:  lastName  ?? undefined,
      unsubscribed: false,
    });
  } catch {
    // best-effort — never block the main flow
  }
}
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://4unter.dullugroup.co.ke";

export async function sendTrialReminderEmail(to: string, daysLeft: number, name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";
  return getResend().emails.send({
    from:    FROM,
    to,
    subject: `Your 4unter trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h2 style="margin:0 0 8px;font-size:20px;">${greeting},</h2>
        <p style="margin:0 0 16px;color:#555;">
          Your 4unter free trial ends in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
          Don't lose access to your leads.
        </p>
        <p style="margin:0 0 24px;color:#555;">
          Upgrade to <strong>4unter Pro</strong> for KES 2,000/month — full pipeline, all verticals, unlimited discovery.
        </p>
        <a href="${SITE}/upgrade"
          style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
          Upgrade now →
        </a>
        <p style="margin:32px 0 0;font-size:12px;color:#999;">
          Questions? Reply to this email or WhatsApp us at +254 700 000 000.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const greeting = name ? `Welcome, ${name}` : "Welcome to 4unter";
  return getResend().emails.send({
    from:    FROM,
    to,
    subject: "Your 4unter trial has started — here's how to get your first leads",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h2 style="margin:0 0 8px;font-size:20px;">${greeting} 🎯</h2>
        <p style="margin:0 0 16px;color:#555;">
          Your 7-day free trial is active. Here's how to get your first qualified leads in under 3 minutes:
        </p>
        <ol style="margin:0 0 24px;padding-left:20px;color:#555;line-height:1.8;">
          <li><strong>Discover</strong> — pick a vertical and city, run a scrape</li>
          <li><strong>Enrich</strong> — crawl each lead's website for contact + signals</li>
          <li><strong>Score</strong> — AI rates every lead 0–100 and surfaces their pain</li>
          <li><strong>Outreach</strong> — generate a personalised WhatsApp opener in one click</li>
        </ol>
        <a href="${SITE}/discover"
          style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
          Find your first leads →
        </a>
        <p style="margin:32px 0 0;font-size:12px;color:#999;">
          Built for the Kenyan market by Dullu Digital.
        </p>
      </div>
    `,
  });
}

export async function sendUpgradeConfirmationEmail(to: string, name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";
  return getResend().emails.send({
    from:    FROM,
    to,
    subject: "You're on 4unter Pro — welcome",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h2 style="margin:0 0 8px;font-size:20px;">${greeting},</h2>
        <p style="margin:0 0 16px;color:#555;">
          Your 4unter Pro account is now active. You have full access to the entire pipeline.
        </p>
        <p style="margin:0 0 24px;color:#555;">
          <strong>Plan:</strong> 4unter Pro · KES 2,000/month<br/>
          Billed monthly · cancel any time from Settings.
        </p>
        <a href="${SITE}/dashboard"
          style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
          Go to dashboard →
        </a>
        <p style="margin:32px 0 0;font-size:12px;color:#999;">
          Receipt and billing questions: billing@dullugroup.co.ke
        </p>
      </div>
    `,
  });
}

export async function sendWorkshopConfirmationEmail(to: string, name: string) {
  return getResend().emails.send({
    from:    FROM,
    to,
    subject: "You're registered — 4unter Workshop",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h2 style="margin:0 0 8px;font-size:20px;">See you Thursday, ${name} 👋</h2>
        <p style="margin:0 0 16px;color:#555;">
          You're registered for the <strong>Find 50 Leads in 30 Minutes</strong> workshop.
        </p>
        <p style="margin:0 0 8px;color:#555;"><strong>When:</strong> Thursday, 6:00 PM – 7:30 PM EAT</p>
        <p style="margin:0 0 24px;color:#555;"><strong>Where:</strong> Zoom (link sent 1 hour before)</p>
        <p style="margin:0 0 24px;color:#555;">
          You will also receive a <strong>30-day free Pro trial</strong> when the session starts.
        </p>
        <p style="margin:32px 0 0;font-size:12px;color:#999;">
          Questions? Reply to this email or WhatsApp +254 700 000 000.
        </p>
      </div>
    `,
  });
}
