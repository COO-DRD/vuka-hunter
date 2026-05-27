"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, GitBranch, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home"     },
  { href: "/discover",  icon: Search,          label: "Discover" },
  { href: "/leads",     icon: Users,           label: "Leads"    },
  { href: "/pipeline",  icon: GitBranch,       label: "Pipeline" },
  { href: "/settings",  icon: Settings,        label: "Settings" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
    >
      <div className="flex h-14 items-stretch">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors relative"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
              )}
              <Icon className={cn(
                "h-5 w-5 transition-all",
                active ? "text-red-400 stroke-[2.5]" : "text-zinc-600"
              )} />
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                active ? "text-red-400" : "text-zinc-600"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
