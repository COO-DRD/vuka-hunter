"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, Users, GitBranch,
  Settings, Upload, LogOut, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HunterWordmark } from "@/components/HunterLogo";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

export const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/discover",  icon: Search,          label: "Discover"  },
  { href: "/leads",     icon: Users,           label: "Leads"     },
  { href: "/pipeline",  icon: GitBranch,       label: "Pipeline"  },
  { href: "/import",    icon: Upload,          label: "Import"    },
  { href: "/settings",  icon: Settings,        label: "Settings"  },
];

export function Sidebar({ email }: { email: string | null }) {
  const path   = usePathname();
  const router = useRouter();
  const initial = email ? email[0].toUpperCase() : "?";

  async function signOut() {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <aside className="hidden md:flex h-screen w-56 flex-col border-r border-zinc-800/60 bg-zinc-950 shrink-0">
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-zinc-800/60">
        <HunterWordmark size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-emerald-600/10 text-emerald-400 ring-1 ring-emerald-600/20"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-emerald-400" : "group-hover:text-zinc-300")} />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}

        {email && ADMIN_EMAILS.has(email) && (
          <Link
            href="/admin"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              path.startsWith("/admin")
                ? "bg-emerald-600/10 text-emerald-400 ring-1 ring-emerald-600/20"
                : "text-zinc-700 hover:bg-zinc-900 hover:text-zinc-500"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-800/60 px-3 py-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
            {initial}
          </div>
          <span className="text-xs text-zinc-400 truncate flex-1 min-w-0" title={email ?? ""}>{email ?? "—"}</span>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
