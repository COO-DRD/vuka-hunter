"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function MobileSignOut() {
  const router = useRouter();

  async function signOut() {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="md:hidden mb-5">
      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-red-400 hover:border-red-800/50 hover:bg-red-950/20 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
