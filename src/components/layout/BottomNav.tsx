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
      className="md:hidden fixed bottom-0 inset-x-0 z-50 backdrop-blur-md"
      style={{
        background: "rgba(22, 27, 34, 0.97)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "max(env(safe-area-inset-bottom), 4px)",
      }}
    >
      <div className="flex h-14 items-stretch">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 relative transition-colors"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-amber-500" />
              )}
              <Icon
                className={cn("h-5 w-5 transition-colors", active ? "text-amber-400" : "")}
                style={active ? {} : { color: "var(--text-3)" }}
              />
              <span
                className={cn("text-[10px] font-medium transition-colors", active ? "text-amber-400" : "")}
                style={active ? {} : { color: "var(--text-3)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
