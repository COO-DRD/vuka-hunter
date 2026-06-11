"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "default" | "ghost" | "outline" | "destructive" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:     "btn-primary",
  ghost:       "btn-ghost-secondary",
  outline:     "btn-outline-secondary",
  destructive: "btn-danger",
  link:        "btn-link",
};

const sizes: Record<Size, string> = {
  sm:   "btn-sm",
  md:   "",
  lg:   "btn-lg",
  icon: "btn-icon",
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
      className={cn("btn", variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
