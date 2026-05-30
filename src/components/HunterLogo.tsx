import { cn } from "@/lib/utils";

/**
 * 4unter brand mark.
 * Bold "4" glyph — right stem with upward compass pointer, crossbar
 * extends past the stem (aiming right). Fills with currentColor so it
 * works on any background.
 */
export function HunterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* Right stem — pointed top (compass indicator), rounded bottom */}
      <path
        d="M13.5 8 L15.25 2.5 L17 8 V20.5 Q17 22 15.25 22 Q13.5 22 13.5 20.5 Z"
        fill="currentColor"
      />
      {/* Left arm — upper section, stops at crossbar */}
      <rect x="4" y="3" width="3.5" height="12" rx="1.5" fill="currentColor" />
      {/* Crossbar — extends 1.5 units past the right stem (subtle aim-right) */}
      <rect x="4" y="12.5" width="15" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function HunterWordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize  = size === "lg" ? "h-7 w-7"  : size === "sm" ? "h-4 w-4"  : "h-5 w-5";
  const textClass = size === "lg" ? "text-xl"   : size === "sm" ? "text-sm"  : "text-base";
  const boxSize   = size === "lg" ? "h-11 w-11 rounded-xl" : size === "sm" ? "h-7 w-7 rounded-md" : "h-9 w-9 rounded-lg";

  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        "flex items-center justify-center shrink-0 text-white",
        "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700",
        "shadow-[0_2px_12px_rgba(16,185,129,0.35)]",
        boxSize
      )}>
        <HunterMark className={iconSize} />
      </div>
      <span className={cn("font-bold tracking-tight", textClass)}>
        <span className="text-emerald-400">4</span>
        <span className="text-zinc-100">UNTER</span>
      </span>
    </div>
  );
}
