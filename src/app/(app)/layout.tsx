import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto bg-zinc-950"
        style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        {/* Safe area top padding on mobile (for iPhone notch area) */}
        <div className="md:hidden h-[env(safe-area-inset-top,0px)]" />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
