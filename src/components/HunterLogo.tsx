import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 4unter brand mark — geometric "4" with diagonal left arm and crossbar
 * extending past the right stem. All sharp angles, no decorative curves.
 * Fills with currentColor so it renders on any background.
 */
export function HunterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* Left diagonal arm — sharp parallelogram, top-left to crossbar */}
      <polygon points="2,2 6,2 11,12.5 7,12.5" fill="currentColor" />
      {/* Crossbar — full width, extends 1px past right stem */}
      <rect x="2" y="12.5" width="17.5" height="3.5" rx="0.5" fill="currentColor" />
      {/* Right stem — tall, anchors the numeral */}
      <rect x="16.5" y="2" width="3.5" height="18" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function HunterWordmark({ size = "md", onLight = false }: { size?: "sm" | "md" | "lg"; onLight?: boolean }) {
  const iconSize  = size === "lg" ? "h-7 w-7"  : size === "sm" ? "h-4 w-4"  : "h-5 w-5";
  const textClass = size === "lg" ? "text-xl"   : size === "sm" ? "text-sm"  : "text-base";
  const boxSize   = size === "lg" ? "h-11 w-11 rounded-xl" : size === "sm" ? "h-7 w-7 rounded-md" : "h-9 w-9 rounded-lg";

  return (
    <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
      <div className={cn(
        "flex items-center justify-center shrink-0 text-zinc-950",
        "bg-amber-400",
        "shadow-[0_2px_16px_rgba(245,158,11,0.45)]",
        boxSize
      )}>
        <HunterMark className={iconSize} />
      </div>
      <span className={cn("font-black tracking-tighter", textClass)}>
        <span className="text-amber-400">4</span>
        <span className={onLight ? "text-stone-950" : "text-zinc-100"}>UNTER</span>
      </span>
    </Link>
  );
}
