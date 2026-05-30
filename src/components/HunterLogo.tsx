import { cn } from "@/lib/utils";

/**
 * 4unter brand mark — bold geometric "4" numeral.
 * Distinct from hunter.io's crosshair; references the brand name directly.
 */
export function HunterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* Left arm + crossbar */}
      <path d="M 8 4 L 8 14 L 18 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Right stem — full height */}
      <line x1="16" y1="3" x2="16" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** The full Hunter wordmark — icon + text. */
export function HunterWordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize  = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const textClass = size === "lg" ? "text-xl"  : size === "sm" ? "text-sm"  : "text-base";

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0",
        size === "lg" ? "h-10 w-10 rounded-xl" : size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-md"
      )}>
        <HunterMark className={iconSize} />
      </div>
      <span className={cn("font-bold tracking-tight text-zinc-100", textClass)}>
        4UNTER
      </span>
    </div>
  );
}
