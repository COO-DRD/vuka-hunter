import { cn } from "@/lib/utils";

/** Crosshair target mark — the Hunter brand icon. */
export function HunterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="2.5" x2="12" y2="7"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5" y1="12" x2="7"   y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17"  y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" />
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
        "flex items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white shrink-0",
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
