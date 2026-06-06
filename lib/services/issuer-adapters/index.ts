import type { CardType } from "@/types";
import { discoverAdapter } from "./discover";
import { chaseAdapter } from "./chase";
import { amexAdapter } from "./amex";
import { robinhoodAdapter } from "./robinhood";
import type { RowAdapter } from "./types";

const ROW_ADAPTERS: Partial<Record<CardType, RowAdapter>> = {
  discover_it_student: discoverAdapter,
  chase_sapphire_preferred: chaseAdapter,
  chase_prime_visa: chaseAdapter,
  amex_bcp: amexAdapter,
  robinhood_gold: robinhoodAdapter,
};

/**
 * Pick the row adapter for a card type. Issuers without a registered adapter
 * fall back to the Discover-style adapter (positive=debit, negative=payment/credit),
 * which matches the historical default and most generic Visa CSVs.
 */
export function getRowAdapter(cardType: CardType): RowAdapter {
  return ROW_ADAPTERS[cardType] ?? discoverAdapter;
}

export type { RowAdapter };
