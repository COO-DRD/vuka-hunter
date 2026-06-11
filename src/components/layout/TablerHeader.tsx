"use client";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { IconLogout, IconSettings } from "@tabler/icons-react";
import Link from "next/link";

interface TablerHeaderProps {
  email: string | null;
  plan?: string | null;
}

export function TablerHeader({ email, plan }: TablerHeaderProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <header className="navbar navbar-expand-md d-none d-md-flex d-print-none" style={{ borderBottom: "1px solid var(--tblr-border-color)" }}>
      <div className="container-xl">
        <div className="navbar-nav flex-row order-md-last gap-2">
          {plan && plan !== "free" && (
            <span className="badge bg-primary-lt text-primary align-self-center" style={{ fontSize: "0.7rem" }}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          )}

          <div className="nav-item dropdown">
            <a
              href="#"
              className="nav-link d-flex align-items-center gap-2 px-0"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span
                className="avatar avatar-sm rounded-circle text-white fw-bold"
                style={{ background: "var(--tblr-primary)", fontSize: "0.7rem" }}
              >
                {initial}
              </span>
              <span className="d-none d-xl-block text-secondary small text-truncate" style={{ maxWidth: 160 }}>
                {email}
              </span>
            </a>
            <div className="dropdown-menu dropdown-menu-end">
              <Link href="/settings" className="dropdown-item d-flex align-items-center gap-2">
                <IconSettings size={16} stroke={1.5} className="text-muted" />
                Settings
              </Link>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item d-flex align-items-center gap-2 text-danger"
                onClick={() => signOut(() => router.push("/sign-in"))}
              >
                <IconLogout size={16} stroke={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
