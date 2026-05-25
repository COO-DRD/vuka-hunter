"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, GitBranch, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// 5 most-used items for the phone tab bar
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
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
    >
      <div className="flex h-14 items-stretch">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-red-400" : "text-zinc-500"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
