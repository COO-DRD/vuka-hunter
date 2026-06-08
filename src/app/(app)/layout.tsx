import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { EnterpriseBanner } from "@/components/EnterpriseBanner";
import { ThemeProvider, ThemeToggleMobile } from "@/components/ThemeProvider";
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
    <ThemeProvider>
      {/* Desktop: fixed viewport height with sidebar scroll. Mobile: body scrolls
          naturally — h-screen + overflow-hidden clips content on Safari iOS because
          100vh > visible area when the browser toolbar is showing. */}
      <div className="flex md:h-screen md:overflow-hidden">
        <Sidebar email={email} />
        <main
          className="flex-1 md:overflow-y-auto"
          style={{ background: "var(--background)", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
        <BottomNav />
        <ThemeToggleMobile />
        <InstallPrompt />
        <EnterpriseBanner />
      </div>
    </ThemeProvider>
  );
}
