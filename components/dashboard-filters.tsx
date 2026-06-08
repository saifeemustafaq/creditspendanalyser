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
import { MobileFilterBar } from "@/components/mobile-filter-bar";
import { MobileFilterField } from "@/components/mobile-filter-field";
import { mobileFilterTriggerClass } from "@/lib/mobile-filter-sheet";
import { CARD_LABELS } from "@/types";

const RANGES = [
  { value: "1m", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const DEFAULT_RANGE = "12m";

type DashboardFiltersProps = {
  pushTo?: string;
};

export function DashboardFilters({ pushTo = "/" }: DashboardFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const range = params.get("range") ?? DEFAULT_RANGE;
  const card = params.get("cardType") ?? "all";
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";

  function update(next: {
    range?: string;
    cardType?: string;
    startDate?: string | null;
    endDate?: string | null;
  }) {
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
    router.push(`${pushTo}?${sp.toString()}`);
  }

  const activeCount =
    (range !== DEFAULT_RANGE ? 1 : 0) + (card !== "all" ? 1 : 0);
  const rangeLabel = RANGES.find((entry) => entry.value === range)?.label ?? range;

  function renderFilters() {
    return (
      <>
        <Select value={range} onValueChange={(v) => v && update({ range: v })}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {range === "custom" ? (
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => update({ startDate: e.target.value || null })}
              className="w-full md:w-[160px]"
              aria-label="Start date"
            />
            <span className="hidden text-sm text-muted-foreground md:inline">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => update({ endDate: e.target.value || null })}
              className="w-full md:w-[160px]"
              aria-label="End date"
            />
          </div>
        ) : null}

        <Select value={card} onValueChange={(v) => v && update({ cardType: v })}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cards</SelectItem>
            {Object.entries(CARD_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }

  function renderMobileFilters() {
    return (
      <>
        <MobileFilterField label="Date range">
          <Select value={range} onValueChange={(v) => v && update({ range: v })}>
            <SelectTrigger className={mobileFilterTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MobileFilterField>

        {range === "custom" ? (
          <MobileFilterField label="Custom dates">
            <div className="flex flex-col gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => update({ startDate: e.target.value || null })}
                className={mobileFilterTriggerClass}
                aria-label="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => update({ endDate: e.target.value || null })}
                className={mobileFilterTriggerClass}
                aria-label="End date"
              />
            </div>
          </MobileFilterField>
        ) : null}

        <MobileFilterField label="Card">
          <Select value={card} onValueChange={(v) => v && update({ cardType: v })}>
            <SelectTrigger className={mobileFilterTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cards</SelectItem>
              {Object.entries(CARD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MobileFilterField>
      </>
    );
  }

  return (
    <MobileFilterBar
      activeCount={activeCount}
      quickChips={
        <span className="min-w-0 truncate text-xs text-muted-foreground">{rangeLabel}</span>
      }
      renderFilters={renderFilters}
      renderMobileFilters={renderMobileFilters}
    />
  );
}
