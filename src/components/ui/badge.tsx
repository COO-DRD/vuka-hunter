import { cn } from "@/lib/utils";

type Variant = "default" | "green" | "yellow" | "red" | "blue" | "purple" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-secondary text-secondary-fg",
  green:   "bg-success-lt text-success",
  yellow:  "bg-warning-lt text-warning",
  red:     "bg-danger-lt text-danger",
  blue:    "bg-info-lt text-info",
  purple:  "bg-purple-lt text-purple",
  outline: "bg-transparent border text-secondary",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span className={cn("badge", variants[variant], className)}>
      {children}
    </span>
  );
}
