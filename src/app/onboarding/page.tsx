import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import OnboardingWizard from "./OnboardingWizard";
import CorporateOnboardingWizard from "./CorporateOnboardingWizard";

export default async function OnboardingPage() {
  const user = await requireUser();
  const db   = createSupabaseServiceClient();

  const { data: org } = await db
    .from("hunter_orgs")
    .select("business_name,sender_name,use_case,org_description,target_description,priority_signals,outreach_channel,onboarding_complete,account_type,seat_limit,company_name")
    .eq("id", user.id)
    .maybeSingle();

  if (org?.account_type === "corporate") {
    return <CorporateOnboardingWizard existing={org} orgId={user.id} />;
  }

  return <OnboardingWizard existing={org} />;
}
