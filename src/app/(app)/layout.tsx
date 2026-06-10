import { TablerSidebar } from "@/components/layout/TablerSidebar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getUser, resolveOrgId } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  let email: string | null = null;

  if (user) {
    const orgId = await resolveOrgId(user.id);
    const db = createSupabaseServiceClient();
    const { data: org } = await db
      .from("hunter_orgs")
      .select("onboarding_complete, account_type")
      .eq("id", orgId)
      .maybeSingle();

    if (!org?.onboarding_complete) redirect("/onboarding");
    email = user.email;
  }

  return (
    <div className="page">
      <TablerSidebar email={email} />
      <div className="page-wrapper">
        <div className="page-body">
          {children}
        </div>
      </div>
      <InstallPrompt />
    </div>
  );
}
