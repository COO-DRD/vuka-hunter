"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  IconLayoutDashboard, IconSearch, IconUsers, IconGitBranch,
  IconSettings, IconUpload, IconShield, IconSun, IconMoon, IconLogout,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { HunterWordmark } from "@/components/HunterLogo";

const NAV_ITEMS = [
  { href: "/dashboard", icon: IconLayoutDashboard, label: "Dashboard" },
  { href: "/discover",  icon: IconSearch,          label: "Discover"  },
  { href: "/leads",     icon: IconUsers,           label: "Leads"     },
  { href: "/pipeline",  icon: IconGitBranch,       label: "Pipeline"  },
  { href: "/import",    icon: IconUpload,          label: "Import"    },
  { href: "/settings",  icon: IconSettings,        label: "Settings"  },
];

interface Props {
  email: string | null;
  isAdmin: boolean;
  plan?: string | null;
}

export function TablerNavbar({ email, isAdmin, plan }: Props) {
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
    <header className="navbar navbar-expand-md d-print-none sticky-top">
      <div className="container-xl">
        {/* Mobile toggler */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbar-menu"
          aria-controls="navbar-menu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Brand */}
        <h1 className="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
          <Link href="/dashboard" className="text-decoration-none">
            <HunterWordmark size="sm" onLight={!dark} />
          </Link>
        </h1>

        {/* Right-side items — always visible */}
        <div className="navbar-nav flex-row order-md-last">
          {/* Theme toggle */}
          <div className="nav-item me-1">
            <button
              className="nav-link px-2"
              onClick={toggleTheme}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {dark
                ? <IconSun size={18} stroke={1.5} className="text-secondary" />
                : <IconMoon size={18} stroke={1.5} className="text-secondary" />
              }
            </button>
          </div>

          {/* Vertical divider */}
          <div className="d-none d-md-flex align-items-center me-2">
            <div style={{ width: 1, height: 24, background: "var(--tblr-border-color)" }} />
          </div>

          {/* User dropdown */}
          <div className="nav-item dropdown">
            <a
              href="#"
              className="nav-link d-flex lh-1 text-reset p-0"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span
                className="avatar avatar-sm"
                style={{ background: "var(--tblr-primary)", color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}
              >
                {initial}
              </span>
              <div className="d-none d-xl-block ps-2">
                <div className="small fw-medium lh-1">{email}</div>
                {plan && (
                  <div className="mt-1 small text-secondary lh-1 text-capitalize">{plan}</div>
                )}
              </div>
            </a>
            <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
              <Link href="/settings" className="dropdown-item">
                <IconSettings size={16} stroke={1.5} className="me-2 icon text-muted" />
                Settings
              </Link>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item text-danger w-100 text-start"
                onClick={() => signOut(() => router.push("/sign-in"))}
              >
                <IconLogout size={16} stroke={1.5} className="me-2 icon" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Nav links — collapse on mobile */}
        <div className="collapse navbar-collapse" id="navbar-menu">
          <div className="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center">
            <ul className="navbar-nav">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
                <li key={href} className="nav-item">
                  <Link
                    href={href}
                    className={`nav-link${path.startsWith(href) ? " active" : ""}`}
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <Icon size={16} stroke={1.5} />
                    </span>
                    <span className="nav-link-title">{label}</span>
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li className="nav-item">
                  <Link
                    href="/admin"
                    className={`nav-link${path.startsWith("/admin") ? " active" : ""}`}
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <IconShield size={16} stroke={1.5} />
                    </span>
                    <span className="nav-link-title">Admin</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
