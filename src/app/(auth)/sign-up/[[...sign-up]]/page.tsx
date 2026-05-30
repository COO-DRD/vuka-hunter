"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, User, Zap, Clock, Shield, Building2 } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HunterWordmark, HunterMark } from "@/components/HunterLogo";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const PERKS = [
  { icon: Zap,    text: "7-day free trial — full access, no credit card" },
  { icon: Clock,  text: "First leads ready in under 2 minutes" },
  { icon: Shield, text: "Kenya DPA 2019 compliant — your data stays yours" },
];

const COMPANY_SIZES = [
  "1–5 employees", "6–20 employees", "21–50 employees",
  "51–200 employees", "200+ employees",
];

const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu",
  "Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana",
  "Uasin Gishu","Vihiga","Wajir","West Pokot",
];

// ── Password strength ─────────────────────────────────────────────────────────
function scorePassword(pw: string, isCorporate: boolean): {
  score: number; // 0-4
  label: string;
  color: string;
  hints: string[];
} {
  const hints: string[] = [];
  let score = 0;

  if (pw.length >= (isCorporate ? 12 : 8)) score++;
  else hints.push(isCorporate ? "At least 12 characters" : "At least 8 characters");

  if (/[A-Z]/.test(pw)) score++;
  else hints.push("One uppercase letter");

  if (/[a-z]/.test(pw)) score++;
  else hints.push("One lowercase letter");

  if (/[0-9]/.test(pw)) score++;
  else hints.push("One number");

  if (isCorporate) {
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    else hints.push("One special character (!@#$%)");
    // 5-point scale for corporate
    const labels = ["Very weak","Weak","Fair","Strong","Very strong"];
    const colors = ["bg-red-500","bg-orange-500","bg-yellow-500","bg-lime-500","bg-green-500"];
    return { score, label: labels[score] ?? "Very weak", color: colors[score] ?? "bg-red-500", hints };
  }

  // 4-point scale for individual
  const labels = ["Weak","Fair","Strong","Very strong"];
  const colors = ["bg-red-500","bg-yellow-500","bg-lime-500","bg-green-500"];
  return { score, label: labels[score - 1] ?? "Weak", color: colors[score - 1] ?? "bg-red-500", hints };
}

function PasswordStrengthBar({ password, isCorporate }: { password: string; isCorporate: boolean }) {
  if (!password) return null;
  const { score, label, color, hints } = scorePassword(password, isCorporate);
  const max = isCorporate ? 5 : 4;
  const pct = Math.round((score / max) * 100);

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i < score ? color : "bg-zinc-800"
          )} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs", pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400")}>
          {label}
        </span>
        {hints.length > 0 && (
          <span className="text-xs text-zinc-600">needs: {hints[0]}</span>
        )}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const [accountType, setAccountType] = useState<"individual" | "corporate">("individual");

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);

  // Location
  const [county,  setCounty]  = useState("");
  const [address, setAddress] = useState("");

  // Consents
  const [termsAccepted, setTerms] = useState(false);
  const [dpaAccepted,   setDpa]   = useState(false);

  // Corporate
  const [companyName,  setCompanyName]  = useState("");
  const [companySize,  setCompanySize]  = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  const [hp, setHp] = useState("");

  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isCorporate      = accountType === "corporate";
  const allConsentsGiven = termsAccepted && dpaAccepted;

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!allConsentsGiven) {
      setError(isCorporate
        ? "You must accept all three consent declarations to continue."
        : "You must accept the Terms and Kenya DPA consent to continue."
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name, email, password,
          termsAccepted: true,
          dpaAccepted:   true,
          accountType,
          operatingCounty:  county || null,
          operatingAddress: address || null,
          _hp: hp,
          ...(isCorporate && {
            companyName, companySize,
            billingEmail: billingEmail || email,
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong."); return; }
      window.location.assign(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch { setError("Something went wrong. Check your connection."); }
    finally   { setLoading(false); }
  }

  async function handleGoogle() {
    if (!allConsentsGiven) {
      setError("Please accept the required consents before signing up with Google.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    try {
      const sb      = createSupabaseBrowserClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options:  { redirectTo: `${siteUrl}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" } },
      });
      if (error) setError(error.message);
    } catch { setError("Google sign-in failed. Try again."); }
    finally  { setGoogleLoading(false); }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col auth-grid-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-orange-950/20 pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 opacity-[0.04] text-white">
          <HunterMark className="h-80 w-80" />
        </div>
        <div className="relative flex flex-col h-full px-10 py-10">
          <HunterWordmark size="md" />
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-3xl font-bold text-zinc-100 leading-tight mb-3">
              Start hunting in<br />
              <span className="text-brand-gradient">under 2 minutes.</span>
            </p>
            <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
              7-day free trial. No credit card required.
            </p>
            <div className="space-y-4">
              {PERKS.map(({ icon: Icon, text }, i) => (
                <div key={text} className={`flex items-center gap-3 animate-fade-up delay-${(i + 1) * 75}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Icon className="h-4 w-4 text-orange-400" />
                  </div>
                  <span className="text-sm text-zinc-400">{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-xl border border-red-900/40 bg-red-950/20 px-5 py-4">
              <p className="text-sm font-semibold text-red-400 mb-1">
                {isCorporate ? "14-Day Corporate Trial" : "7-Day Free Trial"}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {isCorporate
                  ? "Full access + 5 seats. After 14 days, corporate plans from KES 5,000/month."
                  : "Full access. After 7 days, plans start at KES 2,500/month."}
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-700">Dullu Digital · hunter.dullugroup.co.ke</p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-start justify-center bg-zinc-950 px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex justify-center mb-8">
            <HunterWordmark size="md" />
          </div>

          <h2 className="text-xl font-bold text-zinc-100 mb-1">Create your account</h2>
          <p className="text-sm text-zinc-500 mb-5">Free trial · No credit card needed.</p>

          {/* Account type */}
          <div className="flex gap-2 mb-5">
            {(["individual", "corporate"] as const).map((type) => (
              <button key={type} type="button" onClick={() => { setAccountType(type); setError(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                  accountType === type
                    ? "border-emerald-600/60 bg-emerald-600/10 text-zinc-100"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                )}>
                {type === "individual" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                {type === "individual" ? "Individual" : "Corporate"}
              </button>
            ))}
          </div>

          {isCorporate && (
            <div className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/10 px-4 py-3 text-xs text-amber-400">
              Corporate accounts get a <strong>14-day trial</strong>, 5 seats, team workspace, and priority support.
              Password policy is stricter (12+ characters with complexity).
            </div>
          )}

          <Button type="button" variant="outline" onClick={handleGoogle} loading={googleLoading}
            className="w-full mb-4 gap-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 h-10"
            disabled={!allConsentsGiven}>
            {!googleLoading && <GoogleIcon />} Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-950 px-2 text-zinc-600">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name" required autoFocus autoComplete="name" className="pl-9" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Work email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" required autoComplete="email" />
            </div>

            {/* Password + strength meter */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Password{" "}
                <span className="text-zinc-600">
                  {isCorporate ? "(12+ chars, uppercase + number + symbol)" : "(8+ chars, letter + number)"}
                </span>
              </label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isCorporate ? "Min. 12 characters" : "Min. 8 characters"}
                  required minLength={isCorporate ? 12 : 8}
                  autoComplete="new-password" className="pr-10" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1} aria-label={showPw ? "Hide" : "Show"}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={password} isCorporate={isCorporate} />
            </div>

            {/* Location */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 pt-1">Operating location (Kenya)</p>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">County</label>
                <select value={county} onChange={(e) => setCounty(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600/50">
                  <option value="">Select county…</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Physical / postal address <span className="text-zinc-600">(optional)</span>
                </label>
                <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. P.O. Box 12345, Nairobi" autoComplete="street-address" />
              </div>
            </div>

            {/* Corporate fields */}
            {isCorporate && (
              <div className="space-y-3 pt-1 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 pt-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-zinc-600" /> Company details
                </p>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Company name <span className="text-red-500">*</span></label>
                  <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Kenya Ltd." required={isCorporate} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Company size</label>
                  <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600/50">
                    <option value="">Select size…</option>
                    {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Billing email <span className="text-zinc-600">(if different)</span>
                  </label>
                  <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="accounts@company.com" autoComplete="off" />
                </div>
              </div>
            )}

            {/* ── Legal consent section ── */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 pt-1">Required consents</p>

              {/* Terms */}
              <ConsentCheckbox
                id="terms"
                checked={termsAccepted}
                onChange={(v) => { setTerms(v); setError(""); }}>
                I accept the{" "}
                <Link href="/terms" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  Terms of Service &amp; Usage Policy
                </Link>
              </ConsentCheckbox>

              {/* Kenya DPA */}
              <ConsentCheckbox
                id="dpa"
                checked={dpaAccepted}
                onChange={(v) => { setDpa(v); setError(""); }}>
                I consent to Dullu Digital processing my personal and business data to operate the 4unter
                platform, including lead enrichment via publicly available sources, under the{" "}
                <span className="text-zinc-300 font-medium">Kenya Data Protection Act 2019</span>.
                I may request access, correction, or erasure of my data at any time by contacting{" "}
                <span className="text-zinc-300">privacy@dullugroup.co.ke</span>.{" "}
                {isCorporate && (
                  <>
                    As data controller for any third-party contact data processed through this platform,
                    my organisation assumes responsibility for lawful use under the Act.{" "}
                  </>
                )}
              </ConsentCheckbox>
            </div>

            {/* Honeypot — hidden from real users, bots auto-fill it */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 0, height: 0, overflow: "hidden", opacity: 0 }}>
              <label htmlFor="_hp_f">Website</label>
              <input id="_hp_f" type="text" name="website" value={hp} onChange={(e) => setHp(e.target.value)}
                tabIndex={-1} autoComplete="nope" />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button type="submit" loading={loading} disabled={!allConsentsGiven} className="w-full mt-1">
              {isCorporate ? "Create corporate account" : "Start free trial"}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-3">
            {isCorporate ? "14-day corporate trial" : "7-day free trial"} · No credit card
          </p>
          <p className="text-center text-xs text-zinc-500 mt-2">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ConsentCheckbox({
  id, checked, onChange, children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input id={id} type="checkbox" checked={checked}
          onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900 peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition-colors flex items-center justify-center">
          {checked && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
        {children}
      </span>
    </label>
  );
}
