import { requireUser, resolveOrgId } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const user  = await requireUser();
  const orgId = await resolveOrgId(user.id);
  const db    = createSupabaseServiceClient();

  const { data: org } = await db
    .from("hunter_orgs")
    .select("business_name,sender_name,use_case,org_description,target_description,priority_signals,outreach_channel,onboarding_complete")
    .eq("id", orgId)
    .maybeSingle();

  return <OnboardingWizard existing={org} />;
}
