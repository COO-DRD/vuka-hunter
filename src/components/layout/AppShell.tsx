"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  IconLayoutDashboard, IconSearch, IconUsers, IconGitBranch,
  IconSettings, IconUpload, IconShield,
  IconSun, IconMoon, IconLogout, IconBell,
} from "@tabler/icons-react";
import { HunterWordmark } from "@/components/HunterLogo";

const NAV = [
  { href: "/dashboard", icon: IconLayoutDashboard, label: "Dashboard"  },
  { href: "/discover",  icon: IconSearch,          label: "Discover"   },
  { href: "/leads",     icon: IconUsers,           label: "Leads"      },
  { href: "/pipeline",  icon: IconGitBranch,       label: "Pipeline"   },
  { href: "/import",    icon: IconUpload,          label: "Import"     },
  { href: "/settings",  icon: IconSettings,        label: "Settings"   },
];

interface Props {
  email: string | null;
  plan: string | null;
  isAdmin: boolean;
  children: React.ReactNode;
}

export function AppShell({ email, plan, isAdmin, children }: Props) {
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
    <div className="page">
      {/* ── Vertical sidebar ── */}
      <aside className="navbar navbar-vertical navbar-expand-lg">
        <div className="container-fluid">

          {/* Mobile hamburger */}
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#sidebar-menu"
            aria-controls="sidebar-menu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          {/* Logo */}
          <h1 className="navbar-brand navbar-brand-autodark">
            <Link href="/dashboard" className="text-decoration-none">
              <HunterWordmark size="sm" onLight={false} />
            </Link>
          </h1>

          {/* Mobile: user avatar visible on small screens */}
          <div className="navbar-nav flex-row d-lg-none">
            <div className="nav-item">
              <span
                className="avatar avatar-sm"
                style={{ background: "var(--tblr-primary)", color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}
              >
                {initial}
              </span>
            </div>
          </div>

          {/* Collapsible nav */}
          <div className="collapse navbar-collapse" id="sidebar-menu">
            <ul className="navbar-nav pt-lg-3">
              {NAV.map(({ href, icon: Icon, label }) => (
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

              {isAdmin && (
                <>
                  <li className="nav-item mt-2">
                    <div className="nav-link-title text-uppercase text-muted" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", padding: "0.5rem 0.75rem 0.25rem" }}>
                      Admin
                    </div>
                  </li>
                  <li className="nav-item">
                    <Link
                      href="/admin"
                      className={`nav-link${path.startsWith("/admin") ? " active" : ""}`}
                    >
                      <span className="nav-link-icon d-md-none d-lg-block">
                        <IconShield size={18} stroke={1.5} />
                      </span>
                      <span className="nav-link-title">Admin panel</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>

            {/* Sidebar footer */}
            <div className="mt-auto border-top">
              <div className="d-flex align-items-center py-3 px-3 gap-3">
                <span
                  className="avatar avatar-sm"
                  style={{ background: "var(--tblr-primary)", color: "#fff", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}
                >
                  {initial}
                </span>
                <div className="flex-fill overflow-hidden">
                  <div className="small fw-medium text-truncate" style={{ lineHeight: 1.3 }}>{email}</div>
                  {plan && (
                    <div className="small text-muted text-truncate text-capitalize" style={{ lineHeight: 1.2 }}>
                      {plan}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-icon btn-ghost-secondary btn-sm"
                  onClick={toggleTheme}
                  title={dark ? "Light mode" : "Dark mode"}
                >
                  {dark ? <IconSun size={16} stroke={1.5} /> : <IconMoon size={16} stroke={1.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Page wrapper ── */}
      <div className="page-wrapper">

        {/* Top header bar */}
        <header className="navbar navbar-expand-md d-none d-lg-flex d-print-none">
          <div className="container-xl">
            {/* Empty left — breadcrumb can go here per page */}
            <div className="navbar-nav flex-row order-md-last ms-auto gap-1">

              {/* Notifications placeholder */}
              <div className="nav-item">
                <a href="#" className="nav-link px-2" title="Notifications">
                  <IconBell size={18} stroke={1.5} className="text-secondary" />
                </a>
              </div>

              {/* Vertical divider */}
              <div className="d-flex align-items-center mx-1">
                <div style={{ width: 1, height: 20, background: "var(--tblr-border-color)" }} />
              </div>

              {/* User dropdown */}
              <div className="nav-item dropdown">
                <a
                  href="#"
                  className="nav-link d-flex lh-1 text-reset p-0 ps-2"
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
                  <div className="dropdown-header">
                    <div className="fw-medium">{email}</div>
                    {plan && <small className="text-secondary text-capitalize">{plan} plan</small>}
                  </div>
                  <div className="dropdown-divider" />
                  <Link href="/settings" className="dropdown-item">
                    <IconSettings size={16} stroke={1.5} className="me-2 icon text-muted" />
                    Settings
                  </Link>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item text-danger w-100 text-start border-0 bg-transparent"
                    onClick={() => signOut(() => router.push("/sign-in"))}
                  >
                    <IconLogout size={16} stroke={1.5} className="me-2 icon" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="page-body">
          {children}
        </div>
      </div>
    </div>
  );
}
