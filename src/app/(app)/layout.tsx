import { AppShell } from "@/components/layout/AppShell";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getUser, resolveOrgId } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  let email: string | null = null;
  let plan: string | null = null;
  let isAdmin = false;

  if (user) {
    const orgId = await resolveOrgId(user.id);
    const db = createSupabaseServiceClient();
    const { data: org } = await db
      .from("hunter_orgs")
      .select("onboarding_complete, subscribed_plan")
      .eq("id", orgId)
      .maybeSingle();

    if (!org?.onboarding_complete) redirect("/onboarding");
    email = user.email;
    plan = org?.subscribed_plan ?? null;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
    isAdmin = adminEmails.includes(email ?? "");
  }

  return (
    <>
      <AppShell email={email} plan={plan} isAdmin={isAdmin}>
        {children}
      </AppShell>
      <InstallPrompt />
    </>
  );
}
