import { cn } from "@/lib/utils";

type Variant = "default" | "green" | "yellow" | "red" | "blue" | "purple" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-zinc-800 text-zinc-300",
  green:   "bg-green-900/50 text-green-300 border border-green-700/50",
  yellow:  "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50",
  red:     "bg-red-900/50 text-red-300 border border-red-700/50",
  blue:    "bg-blue-900/50 text-blue-300 border border-blue-700/50",
  purple:  "bg-purple-900/50 text-purple-300 border border-purple-700/50",
  outline: "border border-zinc-700 text-zinc-400",
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
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
