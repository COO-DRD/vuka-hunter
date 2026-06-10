"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, Users, GitBranch,
  Settings, Upload, LogOut, Shield, Moon, Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { HunterWordmark } from "@/components/HunterLogo";
import { useTheme } from "@/components/ThemeProvider";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

const SECTIONS = [
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/discover",  icon: Search,          label: "Discover"  },
      { href: "/leads",     icon: Users,           label: "Leads"     },
      { href: "/pipeline",  icon: GitBranch,       label: "Pipeline"  },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/import",   icon: Upload, label: "Import" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

function NavItem({ href, icon: Icon, label, active }: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-[7px] text-sm font-medium transition-all",
        "border-l-2",
        active
          ? "border-amber-500 bg-amber-500/8 text-amber-300"
          : "border-transparent text-[--text-3] hover:text-[--text-1] hover:bg-stone-100"
      )}
    >
      <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-amber-400" : "")} />
      {label}
    </Link>
  );
}

export function Sidebar({ email }: { email: string | null }) {
  const path   = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { theme, toggle } = useTheme();
  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <aside
      className="hidden md:flex h-screen w-56 flex-col shrink-0"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-[18px]" style={{ borderBottom: "1px solid var(--border)" }}>
        <HunterWordmark size="sm" onLight />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-5">
        {SECTIONS.map(({ label, items }) => (
          <div key={label}>
            <p className="px-4 mb-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
              {label}
            </p>
            <div className="space-y-px px-2">
              {items.map(({ href, icon, label: itemLabel }) => (
                <NavItem
                  key={href}
                  href={href}
                  icon={icon}
                  label={itemLabel}
                  active={path.startsWith(href)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Admin — only visible to admin emails */}
        {email && ADMIN_EMAILS.has(email) && (
          <div>
            <p className="px-4 mb-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
              Admin
            </p>
            <div className="space-y-px px-2">
              <NavItem href="/admin" icon={Shield} label="Analytics" active={path.startsWith("/admin")} />
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black"
            style={{ background: "var(--brand)" }}
          >
            {initial}
          </div>
          <span className="text-xs truncate flex-1 min-w-0" style={{ color: "var(--text-2)" }}>
            {email ?? "—"}
          </span>
        </div>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-stone-100"
          style={{ color: "var(--text-3)" }}
        >
          {theme === "dark"
            ? <Sun className="h-3.5 w-3.5 shrink-0" />
            : <Moon className="h-3.5 w-3.5 shrink-0" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={() => signOut(() => router.push("/sign-in"))}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-stone-100"
          style={{ color: "var(--text-3)" }}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
