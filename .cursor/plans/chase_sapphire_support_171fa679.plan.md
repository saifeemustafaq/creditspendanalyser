---
name: Chase Sapphire Support
overview: Add Chase Sapphire Preferred statement ingestion by refactoring the single-issuer pipeline into a multi-issuer dispatch system and wiring in Chase-specific adapters for sign convention, transaction typing, and category mapping.
todos:
  - id: types
    content: Add `chase_sapphire_preferred` to CardType union and CARD_LABELS in types/index.ts
    status: pending
  - id: csv-parser
    content: Add TYPE_HEADERS and optional `typeHint` field to StructuredRow in csv-row-parser.ts
    status: pending
  - id: refactor-a
    content: "Refactor category-mapper.ts: per-issuer dispatch + Chase category map. Update mapIssuerCategory signature to take cardType."
    status: pending
  - id: refactor-b
    content: Create lib/services/issuer-adapters/ with discover.ts (moved), chase.ts (new), types.ts, and index.ts dispatch
    status: pending
  - id: pipeline
    content: Update extraction-pipeline.ts to use getRowAdapter(cardType) and pass cardType to categorizer
    status: pending
  - id: categorizer
    content: Update CategorizeOptions and categorizeTransactions in categorizer.ts to accept and forward cardType
    status: pending
  - id: card-detector
    content: Add chase_sapphire_preferred detection branch in card-detector.ts before visa catchall
    status: pending
  - id: extractor
    content: Add chase_sapphire_preferred entry to CARD_PROMPT_HINTS in extractor.ts
    status: pending
  - id: dev-guide
    content: Update DEVELOPER_GUIDE.md structure tree and card types table
    status: pending
  - id: verify
    content: Run tsc --noEmit to verify no type errors
    status: pending
isProject: false
---

# Add Chase Sapphire Preferred Statement Support

## Detected (from sample inspection)

- **Issuer**: Chase Sapphire Preferred (high confidence -- filename contains "Chase", transactions include "CL *Chase Travel")
- **Proposed CardType slug**: `chase_sapphire_preferred`
- **Human label**: "Chase Sapphire Preferred"
- **Sample columns**: `Transaction Date, Post Date, Description, Category, Type, Amount, Memo`
- **Date format**: `MM/DD/YYYY` (already handled by `parseDate()`)
- **Sign convention**: **Inverted + Type column** -- negative = purchase, positive = payment/return. The `Type` column (`Sale`, `Payment`, `Return`, `Adjustment`, `Fee`) is the authoritative signal.
- **Issuer category column**: Yes (13 distinct values, see mapping below)
- **Detection markers**: filename/content contains "chase"; Chase CSVs include a `Memo` column and `Type` column that Discover does not

### Chase Type column values (from 625 rows)

- `Sale` -- purchase (amount is negative)
- `Payment` -- payment to card (amount is positive, category is empty)
- `Return` -- refund (amount is positive)
- `Adjustment` -- correction (positive or negative)
- `Fee` -- annual fee, etc. (amount is negative)

### Chase Category values and proposed mapping to our taxonomy

- `Food & Drink` -> `Dining`
- `Groceries` -> `Groceries`
- `Gas` -> `Gas/Fuel`
- `Shopping` -> `Shopping`
- `Travel` -> `Travel`
- `Bills & Utilities` -> `Utilities`
- `Health & Wellness` -> `Healthcare`
- `Entertainment` -> `Entertainment`
- `Education` -> `Education`
- `Home` -> `Home`
- `Fees & Adjustments` -> `Fees/Interest`
- `Personal` -> `null` (ambiguous: UPS Store, AMC tickets, college transcripts -- fall through to regex/AI)
- `Professional Services` -> `null` (ambiguous: Notion, RentTrack, Campus Living -- fall through to regex/AI)
- `(empty)` -> `null` (payments have no category; handled by type detection)

### Sign convention comparison (Discover vs Chase)

```
               Purchase    Payment     Return/Refund
Discover:      +30.66      -173.93     (negative)
Chase:         -30.66      +2275.83    +54.51
```

The existing `structuredRowToExtracted` hardcodes Discover's convention (positive=debit, negative=payment/credit). Chase is the opposite, **and** provides a `Type` column that makes sign guessing unnecessary.

---

## Pipeline dry-run: reuse / extend / refactor


| #   | Touch point              | File                                                                       | Decision                                                                                                                                                             |
| --- | ------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CSV header heuristics    | [lib/parsers/csv-row-parser.ts](lib/parsers/csv-row-parser.ts)             | **Extend** -- all existing headers match. Add a `TYPE_HEADERS` array (`["type", "transaction type"]`) and expose a new optional `typeHint` field on `StructuredRow`. |
| 2   | Card-type detection      | [lib/services/card-detector.ts](lib/services/card-detector.ts)             | **Extend** -- add a `chase_sapphire_preferred` branch before the generic `visa` catchall.                                                                            |
| 3   | GPT prompt hint          | [lib/services/extractor.ts](lib/services/extractor.ts)                     | **Extend** -- add one entry to `CARD_PROMPT_HINTS`.                                                                                                                  |
| 4   | CardType union and label | [types/index.ts](types/index.ts)                                           | **Extend** -- add slug + label.                                                                                                                                      |
| 5   | Issuer category map      | [lib/services/category-mapper.ts](lib/services/category-mapper.ts)         | **Refactor A** -- first non-Discover issuer triggers restructuring from a single flat map to per-issuer dispatch.                                                    |
| 6   | Sign convention adapter  | [lib/services/extraction-pipeline.ts](lib/services/extraction-pipeline.ts) | **Refactor B** -- first non-Discover-style sign convention triggers extraction of per-issuer row adapters.                                                           |


---

## Plan

### Step 1: Add CardType slug and label ([types/index.ts](types/index.ts))

- Add `"chase_sapphire_preferred"` to the `CardType` union
- Add `chase_sapphire_preferred: "Chase Sapphire Preferred"` to `CARD_LABELS`
- Everything downstream depends on this type existing first

### Step 2: Extend `StructuredRow` with `typeHint` ([lib/parsers/csv-row-parser.ts](lib/parsers/csv-row-parser.ts))

- Add `TYPE_HEADERS = ["type", "transaction type"]`
- Add optional `typeHint: string | null` to the `StructuredRow` type
- In `parseCsvStructured()`, find the type header and populate `typeHint` from each row

This is a backward-compatible extension -- existing Discover CSVs will simply have `typeHint: null`.

### Step 3: Refactor A -- Multi-issuer category dispatch ([lib/services/category-mapper.ts](lib/services/category-mapper.ts))

Replace the single `DISCOVER_CATEGORY_MAP` + flat `mapIssuerCategory(sourceCategory)` with:

```typescript
const DISCOVER_CATEGORY_MAP: Record<string, Category | null> = { /* existing */ };

const CHASE_SAPPHIRE_PREFERRED_CATEGORY_MAP: Record<string, Category | null> = {
  "Food & Drink": "Dining",
  "Groceries": "Groceries",
  "Gas": "Gas/Fuel",
  "Shopping": "Shopping",
  "Travel": "Travel",
  "Bills & Utilities": "Utilities",
  "Health & Wellness": "Healthcare",
  "Entertainment": "Entertainment",
  "Education": "Education",
  "Home": "Home",
  "Fees & Adjustments": "Fees/Interest",
  "Personal": null,
  "Professional Services": null,
};

const ISSUER_CATEGORY_MAPS: Partial<Record<CardType, Record<string, Category | null>>> = {
  discover_it_student: DISCOVER_CATEGORY_MAP,
  chase_sapphire_preferred: CHASE_SAPPHIRE_PREFERRED_CATEGORY_MAP,
};

export function mapIssuerCategory(
  cardType: CardType,
  sourceCategory: string | null | undefined,
): { category: Category; categorizedBy: CategorizationMethod } | null { ... }
```

**Signature change**: `mapIssuerCategory` now takes `cardType` as a first parameter. Update the single call site in [lib/services/categorizer.ts](lib/services/categorizer.ts) (`categorizeTransactions`) to thread `cardType` through `CategorizeOptions`.

### Step 4: Refactor B -- Per-issuer row adapters

Create `lib/services/issuer-adapters/` with three files:

- `**lib/services/issuer-adapters/types.ts`** -- exports `RowAdapter` type: `(row: StructuredRow) => ExtractedTransaction`
- `**lib/services/issuer-adapters/discover.ts`** -- move existing `structuredRowToExtracted` logic verbatim from `extraction-pipeline.ts`
- `**lib/services/issuer-adapters/chase.ts**` -- new adapter that:
  - Uses `row.typeHint` as the primary signal: `"Sale"/"Fee"` -> `debit`, `"Payment"` -> `payment`, `"Return"/"Adjustment"` (positive) -> `credit`
  - Flips the amount sign (Chase purchases are negative, our model stores positive amounts with `type` as direction)
  - Falls back to sign-based heuristic if `typeHint` is missing
- `**lib/services/issuer-adapters/index.ts**` -- dispatch:

```typescript
  const ROW_ADAPTERS: Partial<Record<CardType, RowAdapter>> = {
    discover_it_student: discoverAdapter,
    chase_sapphire_preferred: chaseAdapter,
  };
  export function getRowAdapter(cardType: CardType): RowAdapter {
    return ROW_ADAPTERS[cardType] ?? discoverAdapter;
  }
  

```

In [lib/services/extraction-pipeline.ts](lib/services/extraction-pipeline.ts), replace the inline `structuredRowToExtracted(row)` call with `getRowAdapter(cardType)(row)`. Remove the old `structuredRowToExtracted` function.

### Step 5: Update card detection ([lib/services/card-detector.ts](lib/services/card-detector.ts))

Add a new branch **before** the generic `visa` catchall:

```typescript
if (t.includes("chase") && (t.includes("sapphire") || t.includes("chase travel"))) {
  return "chase_sapphire_preferred";
}
```

Also handle the common case where the filename contains "chase" but no "sapphire" keyword -- this is still likely a Chase Sapphire Preferred based on the CSV format. The detection can check for Chase-specific CSV header patterns (`Type,Amount,Memo` in header row).

### Step 6: Add GPT prompt hint ([lib/services/extractor.ts](lib/services/extractor.ts))

Add one entry to `CARD_PROMPT_HINTS`:

```typescript
chase_sapphire_preferred:
  "This is a Chase Sapphire Preferred statement. Columns: Transaction Date, Post Date, Description, Category, Type, Amount, Memo. The Type column distinguishes Sale (purchase), Payment, Return, Fee, Adjustment. Amounts are negative for purchases and fees, positive for payments and returns.",
```

### Step 7: Thread `cardType` through categorization

In [lib/services/categorizer.ts](lib/services/categorizer.ts), update `CategorizeOptions` and `categorizeTransactions` to accept and pass `cardType`:

```typescript
export interface CategorizeOptions {
  overrideMap?: Map<string, Category>;
  cardType?: CardType;
}
```

The call to `mapIssuerCategory(tx.sourceCategory)` becomes `mapIssuerCategory(cardType, tx.sourceCategory)`.

In [lib/services/extraction-pipeline.ts](lib/services/extraction-pipeline.ts), pass `cardType` into `categorizeTransactions(extracted, { overrideMap, cardType })`.

### Step 8: Update DEVELOPER_GUIDE.md structure tree

Add the new `lib/services/issuer-adapters/` directory and its files to the tree in [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) section 2. Also add `chase_sapphire_preferred` to the card types table in section 18.

### Step 9: Verification

- Run `npx tsc --noEmit` to confirm no type errors
- Visually verify that Discover behavior is unchanged (the adapter is moved, not rewritten)
- Confirm the new slug appears in `CARD_LABELS` for UI dropdowns

---

## What does NOT change (issuer-agnostic invariants)

- `CATEGORIES` list in `types/index.ts` -- no new categories needed
- `category_overrides` collection -- stays issuer-agnostic
- `MERCHANT_RULES` regex in `categorizer.ts` -- stays issuer-agnostic
- Categorization tier order -- unchanged
- Upload UI / review table / dashboard -- automatically pick up the new CardType from `CARD_LABELS`

## Open questions

None -- the user confirmed this is Chase Sapphire Preferred, and the sample CSV provides complete clarity on format, sign convention, categories, and type values.