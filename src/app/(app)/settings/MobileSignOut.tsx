"use client";
import { useRouter } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";
import { useClerk } from "@clerk/nextjs";

export function MobileSignOut() {
  const router = useRouter();
  const { signOut } = useClerk();

  async function handleSignOut() {
    await signOut(() => router.push("/sign-in"));
  }

  return (
    <div className="d-md-none mb-4">
      <button
        onClick={handleSignOut}
        className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
      >
        <IconLogout size={16} stroke={1.5} />
        Sign out
      </button>
    </div>
  );
}
