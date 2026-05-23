"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "default" | "ghost" | "outline" | "destructive" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:     "bg-red-600 hover:bg-red-500 text-white shadow-sm",
  ghost:       "hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100",
  outline:     "border border-zinc-700 hover:bg-zinc-800 text-zinc-300",
  destructive: "bg-red-900 hover:bg-red-800 text-red-100",
  link:        "underline-offset-4 hover:underline text-zinc-400 hover:text-zinc-100 p-0",
};

const sizes: Record<Size, string> = {
  sm:   "h-8 px-3 text-xs rounded-md",
  md:   "h-9 px-4 text-sm rounded-md",
  lg:   "h-10 px-6 text-sm rounded-md",
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
        "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:pointer-events-none",
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
