"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "default" | "ghost" | "outline" | "destructive" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:     "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-500 text-white shadow-sm shadow-amber-900/20",
  ghost:       "hover:bg-stone-100 text-stone-500 hover:text-stone-900",
  outline:     "border border-stone-300 hover:bg-stone-100 hover:border-stone-400 text-stone-600",
  destructive: "bg-red-600 hover:bg-red-500 text-white",
  link:        "underline-offset-4 hover:underline text-stone-500 hover:text-stone-900 p-0",
};

const sizes: Record<Size, string> = {
  sm:   "h-8 px-3 text-xs rounded-md",
  md:   "h-9 px-4 text-sm rounded-md",
  lg:   "h-10 px-6 text-sm rounded-lg",
  icon: "h-9 w-9 rounded-md",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "default", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
