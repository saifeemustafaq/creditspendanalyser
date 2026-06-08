"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardBadge } from "@/components/card-badge";
import { CategoryBadge } from "@/components/category-badge";
import { CATEGORY_COLORS } from "@/lib/constants";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { CATEGORIES, type CardType, type Category } from "@/types";

export type TransactionRowCardProps = {
  merchant: string;
  rawDescription?: string | null;
  transactionDate: string | Date;
  category: Category;
  cardType: CardType;
  amount: number;
  type: "debit" | "credit" | "payment" | "reward";
  onCategoryChange?: (category: Category) => void;
};

export function TransactionRowCard({
  merchant,
  rawDescription,
  transactionDate,
  category,
  cardType,
  amount,
  type,
  onCategoryChange,
}: TransactionRowCardProps) {
  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{merchant}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(transactionDate)}</p>
          {rawDescription && rawDescription !== merchant ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{rawDescription}</p>
          ) : null}
        </div>
        <p className="shrink-0 font-semibold tabular-nums">
          {type !== "debit" && "−"}
          {fmtCurrency(amount)}
        </p>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <CardBadge cardType={cardType} />
        {onCategoryChange ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] }}
            />
            <Select
              value={category}
              onValueChange={(value) => {
                if (value && value !== category) onCategoryChange(value as Category);
              }}
            >
              <SelectTrigger className="h-8 w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <CategoryBadge category={category} />
        )}
      </div>
    </div>
  );
}
