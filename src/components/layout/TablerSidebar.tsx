"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard, IconSearch, IconUsers, IconGitBranch,
  IconSettings, IconUpload, IconShield,
  IconSun, IconMoon,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: IconLayoutDashboard, label: "Dashboard" },
  { href: "/discover",  icon: IconSearch,          label: "Discover"  },
  { href: "/leads",     icon: IconUsers,           label: "Leads"     },
  { href: "/pipeline",  icon: IconGitBranch,       label: "Pipeline"  },
  { href: "/import",    icon: IconUpload,          label: "Import"    },
  { href: "/settings",  icon: IconSettings,        label: "Settings"  },
];

export function TablerSidebar({ email, isAdmin }: { email: string | null; isAdmin: boolean }) {
  const path = usePathname();
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

            {isAdmin && (
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

          {/* Bottom: theme toggle */}
          <div className="mt-auto pt-3 border-top">
            <button
              onClick={toggleTheme}
              className="btn btn-ghost-secondary w-100 justify-content-start gap-2"
              style={{ fontSize: "0.8rem" }}
            >
              {dark ? <IconSun size={16} stroke={1.5} /> : <IconMoon size={16} stroke={1.5} />}
              {dark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
