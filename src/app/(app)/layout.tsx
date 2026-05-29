import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { EnterpriseBanner } from "@/components/EnterpriseBanner";
import { getUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (user) {
    // Gate 1: email must be verified before any app access
    if (!user.email_confirmed_at) {
      const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
      redirect(`/auth/verify-email${emailParam}`);
    }

    const db = createSupabaseServiceClient();
    const { data: org } = await db
      .from("hunter_orgs")
      .select("onboarding_complete, account_type")
      .eq("id", user.id)
      .maybeSingle();

    // Gate 2: onboarding must be complete
    if (!org?.onboarding_complete) redirect("/onboarding");
  }

  return (
    // Desktop: fixed viewport height with sidebar scroll. Mobile: body scrolls
    // naturally — h-screen + overflow-hidden clips content on Safari iOS because
    // 100vh > visible area when the browser toolbar is showing.
    <div className="flex md:h-screen md:overflow-hidden">
      <Sidebar email={user?.email ?? null} />
      <main
        className="flex-1 md:overflow-y-auto bg-zinc-950"
        style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
      <EnterpriseBanner />
    </div>
  );
}
