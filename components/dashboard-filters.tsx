"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CARD_LABELS } from "@/types";

const RANGES = [
  { value: "1m", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export function DashboardFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const range = params.get("range") ?? "12m";
  const card = params.get("cardType") ?? "all";
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";

  function update(next: { range?: string; cardType?: string; startDate?: string | null; endDate?: string | null }) {
    const sp = new URLSearchParams(params.toString());
    if (next.range !== undefined) {
      sp.set("range", next.range);
      if (next.range !== "custom") {
        sp.delete("startDate");
        sp.delete("endDate");
      }
    }
    if (next.cardType !== undefined) sp.set("cardType", next.cardType);
    if (next.startDate !== undefined) {
      if (next.startDate) sp.set("startDate", next.startDate);
      else sp.delete("startDate");
    }
    if (next.endDate !== undefined) {
      if (next.endDate) sp.set("endDate", next.endDate);
      else sp.delete("endDate");
    }
    router.push(`/?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={range} onValueChange={(v) => v && update({ range: v })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {range === "custom" && (
        <>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => update({ startDate: e.target.value || null })}
            className="w-[160px]"
            aria-label="Start date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => update({ endDate: e.target.value || null })}
            className="w-[160px]"
            aria-label="End date"
          />
        </>
      )}

      <Select value={card} onValueChange={(v) => v && update({ cardType: v })}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cards</SelectItem>
          {Object.entries(CARD_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
