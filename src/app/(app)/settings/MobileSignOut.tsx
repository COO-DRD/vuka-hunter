"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

export function MobileSignOut() {
  const router = useRouter();
  const { signOut } = useClerk();

  async function handleSignOut() {
    await signOut(() => router.push("/sign-in"));
  }

  return (
    <div className="md:hidden mb-5">
      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-red-400 hover:border-red-800/50 hover:bg-red-950/20 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
