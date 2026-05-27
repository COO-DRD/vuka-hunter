"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, Users, GitBranch,
  Settings, Zap, ChevronRight, Upload, LogOut, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ADMIN_EMAILS = new Set(["ian.dullu@akamom.org", "dr.dullu@gmail.com"]);

export const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/discover",  icon: Search,          label: "Discover"   },
  { href: "/leads",     icon: Users,           label: "Leads"      },
  { href: "/pipeline",  icon: GitBranch,       label: "Pipeline"   },
  { href: "/import",    icon: Upload,          label: "Import"     },
  { href: "/settings",  icon: Settings,        label: "Settings"   },
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
    <aside className="hidden md:flex h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-950 shrink-0">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-zinc-100 tracking-tight">Hunter</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
        {email && ADMIN_EMAILS.has(email) && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              path.startsWith("/admin")
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            Monitor
            {path.startsWith("/admin") && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
          </Link>
        )}
      </nav>

      <div className="border-t border-zinc-800 px-3 py-3 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600/20 border border-red-600/30 text-xs font-bold text-red-400">
            {initial}
          </div>
          <span className="text-xs text-zinc-400 truncate flex-1" title={email ?? ""}>{email ?? "—"}</span>
        </div>

        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
