import Link from "next/link";
import { Zap, CheckCircle2, XCircle, ShieldCheck, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service & Usage Policy — Hunter",
  description: "Usage rights, permitted and prohibited uses, and data handling policy for Hunter.",
};

const ALLOWED = [
  "Discovering and qualifying B2B leads for your own business development",
  "Generating personalised outreach copy for direct sales campaigns",
  "Market research and competitive intelligence for your own organisation",
  "Scoring and prioritising publicly-listed businesses for partnership outreach",
  "Importing and managing your own lead lists collected through legitimate means",
  "Using the platform as a team within a single registered organisation",
];

const PROHIBITED = [
  "Reselling, redistributing, or sublicensing scraped data to any third party",
  "Automated mass-messaging or spamming of any kind using Hunter-generated copy",
  "Targeting private individuals — Hunter is strictly for B2B business entities",
  "Using the platform to facilitate harassment, threats, or unlawful discrimination",
  "Attempting to reverse-engineer, scrape, or extract the Hunter platform itself",
  "Creating multiple accounts to circumvent usage limits or access controls",
  "Using Hunter outputs to build competing lead intelligence products",
  "Any activity that violates the Kenya Data Protection Act 2019 or applicable law",
];

export default function TermsPage() {
  const effectiveDate = "26 May 2026";

  return (
    <div className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Terms of Service &amp; Usage Policy</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Effective {effectiveDate} · Hunter by Dullu Digital</p>
          </div>
        </div>

        {/* Intro */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-5 mb-8">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Hunter is a B2B lead intelligence and AI outreach tool built and operated by{" "}
            <strong className="text-zinc-100">Dullu Digital</strong> (trading as VUKA AI), registered in Kenya.
            By creating an account or using the platform, you agree to these terms in full.
            If you do not agree, do not use Hunter.
          </p>
        </div>

        {/* Permitted Use */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h2 className="text-base font-semibold text-zinc-100">What You May Do</h2>
          </div>
          <div className="space-y-2">
            {ALLOWED.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/20 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prohibited Use */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-red-400" />
            <h2 className="text-base font-semibold text-zinc-100">What You May Not Do</h2>
          </div>
          <div className="space-y-2">
            {PROHIBITED.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-red-900/30 bg-red-950/10 px-4 py-3">
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Handling */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-semibold text-zinc-100">Data &amp; Privacy</h2>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-5 space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              <strong className="text-zinc-200">What Hunter collects about you:</strong> Your email address,
              account name, business profile information you provide during onboarding, and usage activity
              (lead scrapes, enrichments, and scores). We do not collect payment data during the beta.
            </p>
            <p>
              <strong className="text-zinc-200">What Hunter scrapes on your behalf:</strong> Business names,
              phone numbers, website URLs, addresses, and Google ratings from public sources (Google Maps,
              OpenStreetMap, public business websites). This is publicly available business information —
              not personal data of private individuals.
            </p>
            <p>
              <strong className="text-zinc-200">How we use your data:</strong> To operate the platform,
              improve AI scoring accuracy, and contact you about product updates. We do not sell your
              account data or lead lists to third parties.
            </p>
            <p>
              <strong className="text-zinc-200">Kenya Data Protection Act 2019:</strong> We process personal
              data in accordance with the DPA 2019. You may request access to, correction of, or deletion
              of your personal data by contacting us at{" "}
              <a href="mailto:legal@dullugroup.co.ke" className="text-blue-400 hover:underline">
                legal@dullugroup.co.ke
              </a>.
            </p>
            <p>
              <strong className="text-zinc-200">Data retention:</strong> Your lead data is retained for the
              lifetime of your account. When you delete your account, all leads, scrape jobs, and profile
              data are permanently deleted within 30 days.
            </p>
          </div>
        </section>

        {/* Account & Enforcement */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">Account Rules &amp; Enforcement</h2>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-5 space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              <strong className="text-zinc-200">One account per person.</strong> Accounts are non-transferable.
              You are responsible for all activity under your account.
            </p>
            <p>
              <strong className="text-zinc-200">Termination.</strong> We reserve the right to suspend or
              permanently terminate any account that violates these terms, without notice. Credits and
              data are forfeited upon termination for cause.
            </p>
            <p>
              <strong className="text-zinc-200">Beta terms.</strong> The platform is currently in beta.
              Features, pricing, and usage limits may change. We will give at least 14 days notice before
              introducing paid plans.
            </p>
            <p>
              <strong className="text-zinc-200">Limitation of liability.</strong> Hunter is provided as-is.
              Dullu Digital is not liable for any indirect, incidental, or consequential damages arising
              from your use of the platform or the outreach you send using it.
            </p>
            <p>
              <strong className="text-zinc-200">Governing law.</strong> These terms are governed by the
              laws of Kenya. Any disputes will be resolved in the courts of Nairobi, Kenya.
            </p>
          </div>
        </section>

        {/* Contact */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-6 py-5 text-sm text-zinc-400">
          <p className="mb-1 font-medium text-zinc-200">Questions?</p>
          <p>
            Email{" "}
            <a href="mailto:legal@dullugroup.co.ke" className="text-red-400 hover:underline">
              legal@dullugroup.co.ke
            </a>{" "}
            or visit{" "}
            <a href="https://vuka-six.vercel.app" className="text-red-400 hover:underline" target="_blank" rel="noopener noreferrer">
              dullugroup.co.ke
            </a>.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link href="/sign-in" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to sign in
          </Link>
        </div>

      </div>
    </div>
  );
}
