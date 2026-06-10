import { requireUser, resolveOrgId } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import ChangePasswordForm from "./ChangePasswordForm";
import ClearLeadsButton from "./ClearLeadsButton";
import EnrichmentModeSelector from "@/components/settings/EnrichmentModeSelector";
import { MobileSignOut } from "./MobileSignOut";
import {
  IconBolt, IconInfinity, IconMail, IconCalendar, IconShieldCheck, IconHash,
  IconBuilding, IconPencil, IconCircleCheck, IconCircleX, IconExternalLink,
  IconMapPin, IconFileText, IconBadge,
} from "@tabler/icons-react";

export default async function SettingsPage() {
  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  const { data: org } = await db.from("hunter_orgs").select("*").eq("id", orgId).single();

  const { data: consents } = await db
    .from("hunter_legal_consents")
    .select("consent_type, accepted, accepted_at")
    .eq("org_id", orgId)
    .order("accepted_at", { ascending: false });

  const creditsUsed = org?.credits_used ?? 0;
  const initial     = user.email ? user.email[0].toUpperCase() : "?";
  const memberSince = org?.created_at
    ? new Date(org.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const planLabels: Record<string, string> = { trial: "Free Trial", solo: "Solo", team: "Team", active: "Pro" };
  const planLabel = planLabels[org?.subscribed_plan ?? "active"] ?? "Pro";

  return (
    <div className="container-xl" style={{ maxWidth: 720 }}>
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Settings</h2>
            <div className="text-muted mt-1 small">Account, compliance &amp; preferences</div>
          </div>
        </div>
      </div>

      <MobileSignOut />

      {/* Enrichment mode */}
      <div className="card mb-4">
        <div className="card-header"><h3 className="card-title">Enrichment Mode</h3></div>
        <div className="card-body">
          <p className="text-muted small mb-3">Pick your sales context. 4unter scores leads and writes outreach copy tuned for this use case.</p>
          <EnrichmentModeSelector current={org?.enrichment_mode ?? "general"} />
        </div>
      </div>

      {/* Subscription */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Subscription</h3>
          <div className="card-options">
            <span className="badge bg-success-lt text-success gap-1">
              <IconBolt size={12} /> Active
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <div className="h3 mb-0">{planLabel}</div>
              <div className="text-muted small mt-1">Individual account</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3 text-body-secondary small">
            <IconInfinity size={16} />
            <span style={{ minWidth: 100 }}>Credits</span>
            <span className="text-body">Unlimited · {creditsUsed.toLocaleString()} used</span>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="card mb-4">
        <div className="card-header"><h3 className="card-title">Account</h3></div>
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 mb-4">
            <span className="avatar avatar-lg rounded-circle text-white fw-bold"
              style={{ background: "var(--tblr-primary)", fontSize: "1.1rem" }}>
              {initial}
            </span>
            <div>
              <div className="fw-semibold">{user.email}</div>
              <div className="text-muted small text-capitalize">{org?.name}</div>
            </div>
          </div>
          <div className="list-group list-group-flush">
            <SettingRow icon={IconMail} label="Email">{user.email}</SettingRow>
            <SettingRow icon={IconCalendar} label="Member since">{memberSince}</SettingRow>
            <SettingRow icon={IconShieldCheck} label="Auth">
              {org?.auth_provider === "google" ? "Google OAuth" : "Email / Password"}
            </SettingRow>
            <SettingRow icon={IconBadge} label="Email verified">
              <span className="text-success">Verified</span>
            </SettingRow>
            {org?.operating_county && (
              <SettingRow icon={IconMapPin} label="County">
                {org.operating_county}{org.operating_address ? ` · ${org.operating_address}` : ""}
              </SettingRow>
            )}
            <SettingRow icon={IconHash} label="User ID">
              <span className="font-monospace text-muted small">{user.id}</span>
            </SettingRow>
          </div>
        </div>
      </div>

      {/* Business profile */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Business Profile</h3>
          <div className="card-options">
            <Link href="/onboarding" className="btn btn-ghost-secondary btn-sm gap-1">
              <IconPencil size={13} /> Edit
            </Link>
          </div>
        </div>
        <div className="card-body">
          <div className="list-group list-group-flush">
            <SettingRow icon={IconBuilding} label="Business">{org?.business_name || org?.name || "—"}</SettingRow>
            <SettingRow icon={IconMail} label="Sender name">{org?.sender_name || "—"}</SettingRow>
            {org?.org_description && (
              <SettingRow icon={IconBolt} label="What you do">
                <span className="text-muted">{org.org_description}</span>
              </SettingRow>
            )}
          </div>
          {!org?.use_case && (
            <div className="alert alert-warning mt-3 small">
              Profile not set up yet.{" "}
              <Link href="/onboarding" className="alert-link">Complete setup →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card mb-4">
        <div className="card-header"><h3 className="card-title">Data &amp; Privacy</h3></div>
        <div className="card-body">
          <p className="text-muted small mb-3">
            Your data is processed by Dullu Digital under the Kenya Data Protection Act 2019.
            To exercise your rights (access, correction, erasure, portability), contact{" "}
            <a href="mailto:privacy@dullugroup.co.ke" className="text-primary">privacy@dullugroup.co.ke</a>.
          </p>
          {consents && consents.length > 0 && (
            <div>
              <div className="text-muted small fw-medium mb-2">Consent record</div>
              {consents.map((c) => {
                const labels: Record<string, string> = {
                  terms_of_service:                "Terms of Service",
                  kenya_dpa_data_collection:       "Kenya DPA — Data collection",
                  kenya_dpa_third_party_enrichment:"Kenya DPA — Third-party enrichment",
                  data_processing_agreement:       "Data Processing Agreement",
                  kra_compliance_acknowledgment:   "KRA Compliance",
                  marketing_communications:        "Marketing communications",
                };
                return (
                  <div key={`${c.consent_type}-${c.accepted_at}`} className="d-flex align-items-center gap-2 small text-muted py-1">
                    <IconCircleCheck size={14} className="text-success flex-shrink-0" />
                    <span className="flex-fill">{labels[c.consent_type] ?? c.consent_type}</span>
                    <span className="flex-shrink-0">{new Date(c.accepted_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Usage Policy */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Usage Policy</h3>
          <div className="card-options">
            <Link href="/terms" target="_blank" className="btn btn-ghost-secondary btn-sm gap-1">
              Full terms <IconExternalLink size={13} />
            </Link>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-6">
              <div className="text-success small fw-semibold mb-2 d-flex align-items-center gap-1">
                <IconCircleCheck size={14} /> Permitted
              </div>
              {["B2B lead discovery for your own business", "Market research & intelligence", "Importing your own lead lists"].map((item) => (
                <div key={item} className="d-flex align-items-start gap-2 small text-muted mb-1">
                  <IconCircleCheck size={13} className="text-success flex-shrink-0 mt-1" />{item}
                </div>
              ))}
            </div>
            <div className="col-6">
              <div className="text-danger small fw-semibold mb-2 d-flex align-items-center gap-1">
                <IconCircleX size={14} /> Not permitted
              </div>
              {["Reselling scraped data to third parties", "Mass unsolicited messaging", "Targeting private individuals", "Multiple accounts to bypass limits"].map((item) => (
                <div key={item} className="d-flex align-items-start gap-2 small text-muted mb-1">
                  <IconCircleX size={13} className="text-danger flex-shrink-0 mt-1" />{item}
                </div>
              ))}
            </div>
          </div>
          {org?.terms_accepted_at && (
            <div className="text-muted small mt-3">
              <IconFileText size={13} className="me-1" />
              Terms accepted {new Date(org.terms_accepted_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      {org?.auth_provider !== "google" && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="card-title">Change Password</h3></div>
          <div className="card-body"><ChangePasswordForm /></div>
        </div>
      )}

      {/* API */}
      <div className="card mb-4">
        <div className="card-header"><h3 className="card-title">API Access</h3></div>
        <div className="card-body">
          <p className="text-muted small mb-3">REST API for integrating 4unter with your own tools.</p>
          <div className="bg-light rounded p-3 font-monospace small text-muted">Available in full release</div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card mb-4 border-danger">
        <div className="card-header">
          <h3 className="card-title text-danger">Danger Zone</h3>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <div className="fw-medium">Reset all leads</div>
              <div className="text-muted small mt-1">Delete every lead, scrape job, and reset your credit counter.</div>
            </div>
            <div className="flex-shrink-0"><ClearLeadsButton /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="list-group-item d-flex align-items-center gap-3 px-0 py-2 border-0 border-bottom">
      <Icon size={15} stroke={1.5} className="text-muted flex-shrink-0" />
      <span className="text-muted small" style={{ minWidth: 110 }}>{label}</span>
      <span className="small">{children}</span>
    </div>
  );
}
