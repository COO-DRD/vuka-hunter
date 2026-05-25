import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

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
    </div>
  );
}
