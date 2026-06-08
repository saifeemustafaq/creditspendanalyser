import { cn } from "@/lib/utils";

type TableScrollRegionProps = {
  children: React.ReactNode;
  className?: string;
};

/** Horizontal scroll wrapper for wide tables on mobile; full width on desktop. */
export function TableScrollRegion({ children, className }: TableScrollRegionProps) {
  return (
    <div className={cn("relative max-md:-mx-4", className)}>
      <div className="max-md:overflow-x-auto max-md:px-4 md:overflow-x-visible md:px-0">
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent max-md:block md:hidden"
      />
    </div>
  );
}
