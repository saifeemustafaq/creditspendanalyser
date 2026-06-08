"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MobileFilterFieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
};

export function MobileFilterField({ label, htmlFor, children, className }: MobileFilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
