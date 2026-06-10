"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  IconLayoutDashboard, IconSearch, IconUsers, IconGitBranch,
  IconSettings, IconUpload, IconLogout, IconShield,
  IconSun, IconMoon,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

const NAV_ITEMS = [
  { href: "/dashboard", icon: IconLayoutDashboard, label: "Dashboard" },
  { href: "/discover",  icon: IconSearch,          label: "Discover"  },
  { href: "/leads",     icon: IconUsers,           label: "Leads"     },
  { href: "/pipeline",  icon: IconGitBranch,       label: "Pipeline"  },
  { href: "/import",    icon: IconUpload,          label: "Import"    },
  { href: "/settings",  icon: IconSettings,        label: "Settings"  },
];

export function TablerSidebar({ email }: { email: string | null }) {
  const path = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.setAttribute("data-bs-theme", "dark");
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-bs-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="light">
      <div className="container-fluid">
        {/* Mobile toggler */}
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
          <span className="navbar-toggler-icon" />
        </button>

        {/* Logo */}
        <h1 className="navbar-brand navbar-brand-autodark">
          <Link href="/dashboard" className="text-decoration-none">
            <span className="fw-bold" style={{ color: "var(--tblr-primary)", fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
              4unter
            </span>
          </Link>
        </h1>

        {/* Nav collapse */}
        <div className="collapse navbar-collapse" id="navbar-menu">
          <ul className="navbar-nav pt-lg-3">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
              <li key={href} className="nav-item">
                <Link
                  href={href}
                  className={`nav-link${path.startsWith(href) ? " active" : ""}`}
                >
                  <span className="nav-link-icon d-md-none d-lg-block">
                    <Icon size={18} stroke={1.5} />
                  </span>
                  <span className="nav-link-title">{label}</span>
                </Link>
              </li>
            ))}

            {email && ADMIN_EMAILS.has(email) && (
              <li className="nav-item">
                <Link href="/admin" className={`nav-link${path.startsWith("/admin") ? " active" : ""}`}>
                  <span className="nav-link-icon d-md-none d-lg-block">
                    <IconShield size={18} stroke={1.5} />
                  </span>
                  <span className="nav-link-title">Admin</span>
                </Link>
              </li>
            )}
          </ul>

          {/* Bottom actions */}
          <div className="mt-auto pt-3 border-top">
            {/* User pill */}
            <div className="d-flex align-items-center gap-2 px-3 py-2 mb-1">
              <span
                className="avatar avatar-sm rounded-circle text-white fw-bold"
                style={{ background: "var(--tblr-primary)", fontSize: "0.7rem" }}
              >
                {initial}
              </span>
              <span className="text-truncate small text-secondary" style={{ maxWidth: 120 }}>
                {email ?? "—"}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost-secondary w-100 justify-content-start gap-2 mb-1"
              style={{ fontSize: "0.8rem" }}
            >
              {dark ? <IconSun size={16} stroke={1.5} /> : <IconMoon size={16} stroke={1.5} />}
              {dark ? "Light mode" : "Dark mode"}
            </button>

            {/* Sign out */}
            <button
              onClick={() => signOut(() => router.push("/sign-in"))}
              className="btn btn-ghost-secondary w-100 justify-content-start gap-2"
              style={{ fontSize: "0.8rem" }}
            >
              <IconLogout size={16} stroke={1.5} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
