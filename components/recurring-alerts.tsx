import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RecurringAlert } from "@/types";

export function RecurringAlerts({ alerts }: { alerts: RecurringAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <Card
          key={`${a.merchant}-${a.type}-${i}`}
          className={cn(
            "border-l-4",
            a.severity === "warning" ? "border-l-amber-500" : "border-l-blue-500",
          )}
        >
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
            {a.severity === "warning" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <div className="break-words font-medium">{a.merchant}</div>
              <div className="break-words text-muted-foreground">{a.message}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
