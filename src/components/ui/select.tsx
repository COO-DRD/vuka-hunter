"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("form-select", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
