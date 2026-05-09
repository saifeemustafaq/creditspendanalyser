---
name: add-statement-issuer
description: Add ingestion support for a new credit card statement issuer (Chase, Capital One, Citi, etc.) by inspecting a sample statement the user has tagged in chat, dry-running it against the existing Discover/Visa/Amex pipeline, presenting a plan that maximizes reuse and triggers DRY refactors when warranted, then implementing after approval. Use when the user invokes /add-statement-issuer and references a statement file or folder, or asks to "add support for <issuer>" / "ingest this new statement format".
---

# Add Statement Issuer

You are extending this app's statement ingestion pipeline to support a new credit card issuer. The user has tagged a sample statement file (or folder containing one) in chat. Your job is to (1) inspect that sample, (2) figure out what the existing pipeline will and won't handle, (3) present a reuse-first plan, (4) wait for approval, then (5) implement and verify.

**The flow is: inspect → plan → wait for approval → implement → verify. Never skip the approval step.**

---

## Phase 0 — Locate the sample

1. Read the user's most recent message for a tagged file or folder path. Common locations: `sample-statement/`, an absolute path, or a path the user has just pasted.
2. If the tag is a folder, list it and pick statement-shaped files (`.csv`, `.xls`, `.xlsx`, `.pdf`, `.png`, `.jpg`). If multiple, prefer one per issuer — group by inferred issuer name from filename.
3. If you cannot find a sample, stop and ask the user for the path. Do not proceed.

---

## Phase 1 — Inspect the sample

Read enough of the file to characterize it. For CSV/XLS, read the first ~20 rows including the header. For PDF/image, read the parser output by mentally tracing through `lib/parsers/`.

Record these facts:

- **Issuer name** — from filename and content. If no clear marker, make a best guess from the filename (e.g. `Chase-...csv` → `chase`) and flag it in the plan for the user to confirm.
- **Proposed `CardType` slug** — kebab-case-ish, snake_case to match the existing union (`visa`, `discover_it_student`, `amex_bcp`). Examples: `chase_freedom`, `capital_one_venture`, `citi_double_cash`. Be specific to the card variant when the statement reveals it.
- **Column headers** (CSV/XLS) — verbatim list.
- **Date format** — `MM/DD/YYYY`, `YYYY-MM-DD`, etc.
- **Amount sign convention** — pick exactly one:
  - **Discover-style**: positive = purchase (debit), negative = payment/credit. (Reuses existing `structuredRowToExtracted`.)
  - **Inverted**: positive = payment/credit, negative = purchase.
  - **Split columns**: separate `Debit` and `Credit` columns, both positive.
  - **Type column**: a `Type` / `Transaction Type` column distinguishes (e.g. Chase: `Sale` / `Payment` / `Return`).
- **Issuer category column** — if present, list the distinct values you see.
- **Unique detection markers** — text strings that reliably identify this issuer (header row, footer text, account label).

---

## Phase 2 — Dry-run the existing pipeline

Walk each issuer-specific touch point in the codebase and decide **reuse / extend / refactor** for each. Read the current code; do not assume.

| # | Touch point | File | Decision rule |
|---|---|---|---|
| 1 | CSV header heuristics | `lib/parsers/csv-row-parser.ts` | If all the new statement's headers map to existing aliases (`DATE_HEADERS`, `POST_DATE_HEADERS`, `DESC_HEADERS`, `AMOUNT_HEADERS`, `CATEGORY_HEADERS`), **reuse**. Otherwise add the new aliases to those const arrays — **extend**. |
| 2 | Card-type detection | `lib/services/card-detector.ts` (`detectCardTypeFromText`) | Add a branch with the unique marker(s) from Phase 1. Order matters — put the new branch **before** any branch whose markers might also appear (e.g. retailer rows often contain "Visa"). |
| 3 | GPT prompt hint | `lib/services/extractor.ts` (`CARD_PROMPT_HINTS`) | Always add an entry. Used when the CSV path fails and we fall back to LLM extraction. |
| 4 | `CardType` union & label | `types/index.ts` (`CardType`, `CARD_LABELS`) | Always add the new slug + human label. |
| 5 | Issuer category map | `lib/services/category-mapper.ts` | **First non-Discover issuer triggers a refactor** — see Phase 3 below. After refactor, this is just "add a new map". |
| 6 | Sign convention adapter | `lib/services/extraction-pipeline.ts` (`structuredRowToExtracted`) | If sign convention from Phase 1 is **Discover-style**, reuse. Otherwise **refactor** — see Phase 3 below. |

For each row, write down: *reuse* / *extend (1-line summary)* / *refactor (1-line summary)*.

---

## Phase 3 — DRY refactors triggered by the new issuer

These refactors only happen the **first time** they're triggered. After that, future issuers slot into the new structure as pure additions.

### Refactor A — Issuer category dispatch (`category-mapper.ts`)

**Trigger:** Adding any non-Discover issuer that has a category column.

**Current shape:** One hardcoded `DISCOVER_CATEGORY_MAP`. `mapIssuerCategory()` consults only that map.

**New shape:**

```ts
const ISSUER_CATEGORY_MAPS: Partial<Record<CardType, Record<string, Category | null>>> = {
  discover_it_student: DISCOVER_CATEGORY_MAP,
  // chase_freedom: CHASE_FREEDOM_CATEGORY_MAP,
};

export function mapIssuerCategory(
  cardType: CardType,
  sourceCategory: string | null | undefined,
): { category: Category; categorizedBy: CategorizationMethod } | null { ... }
```

`mapIssuerCategory` now takes `cardType` as a parameter. Update the **one call site** in `lib/services/categorizer.ts` (in `categorizeTransactions`) to pass it through. `categorizeTransactions` already receives `ExtractedTransaction[]` — thread `cardType` through `CategorizeOptions` rather than per-transaction.

### Refactor B — Per-issuer row adapter

**Trigger:** Adding any issuer whose sign convention is not Discover-style (positive=debit, negative=payment/credit).

**Current shape:** `structuredRowToExtracted` in `lib/services/extraction-pipeline.ts` hardcodes Discover semantics.

**New shape:** create `lib/services/issuer-adapters/` with one file per issuer, each exporting a pure function:

```ts
// lib/services/issuer-adapters/types.ts
import type { ExtractedTransaction } from "@/types";
import type { StructuredRow } from "@/lib/parsers";
export type RowAdapter = (row: StructuredRow) => ExtractedTransaction;

// lib/services/issuer-adapters/index.ts
import type { CardType } from "@/types";
import type { RowAdapter } from "./types";
import { discoverAdapter } from "./discover";
import { chaseAdapter } from "./chase";
export const ROW_ADAPTERS: Partial<Record<CardType, RowAdapter>> = {
  discover_it_student: discoverAdapter,
  chase_freedom: chaseAdapter,
};
export function getRowAdapter(cardType: CardType): RowAdapter {
  return ROW_ADAPTERS[cardType] ?? discoverAdapter; // safe default
}
```

Move the existing logic in `structuredRowToExtracted` into `discover.ts` verbatim. In `extraction-pipeline.ts`, replace the call with `getRowAdapter(cardType)(row)`. Each new issuer adds one file.

**Do not refactor preemptively.** If the new issuer is Discover-style, skip Refactor B. The presence of two distinct sign conventions is what triggers the extraction — DEVELOPER_GUIDE.md §4 ("Extract only when used by 2+ distinct modules").

---

## Phase 3.5 — Issuer-agnostic invariants (DO NOT TOUCH)

These are deliberately shared across all issuers. Adding an issuer must **not** split, branch, or shadow them per-issuer. If you find yourself wanting to, stop and ask the user — it's almost certainly the wrong move.

- **`category_overrides` collection** (`lib/models/category-overrides.ts`) — user-learned merchant→category mappings. Issuer-agnostic by design: a user's "Walmart → Groceries" learning applies to Walmart on any card. Never key overrides by `cardType`.
- **Regex merchant rules** (`MERCHANT_RULES` in `lib/services/categorizer.ts`) — generic merchant patterns (Starbucks, Shell, Netflix, etc.). Issuer-agnostic. Adding an issuer never requires editing these. If a real merchant pattern is missing, that's a separate change unrelated to onboarding the issuer.
- **`CATEGORIES` list** (`types/index.ts`) — the app's fixed category taxonomy. Do **not** extend it as part of adding an issuer. The new issuer's categories must map *into* the existing list (use `null` in the issuer map for ambiguous values to fall through to regex/AI tiers). Extending `CATEGORIES` is a cross-cutting change that touches the dashboard, charts, exports, and the categorizer prompt — explicitly out of scope for this skill.
- **Categorization tier order** (`categorizeTransactions` in `lib/services/categorizer.ts`) — payment/credit type → user override → issuer source map → regex → AI. Don't reorder per-issuer.

A parallel summary of these invariants lives in `.cursor/rules/add-card-issuer.mdc` for Cursor users; keep both in sync if you change the skill.

---

## Phase 4 — Present the plan and STOP

Write a plan to the chat (do not write it as a file unless the user asks). Use this structure:

```
## Detected
- Issuer: <name> (confidence: <high/medium/low — best guess from filename if unclear>)
- Proposed CardType slug: <slug>
- Sample columns: <list>
- Sign convention: <one of the four>
- Issuer category column: <yes (N values: ...) | no>

## Plan

### Reuse (no change)
- <touch point>: <reason>

### Extend (small additions)
- <file>: <one-line summary of what gets added>

### Refactor (DRY trigger)
- <file>: <which refactor and why>

### New files
- <path>: <responsibility>

### Files modified (summary)
- <path>:<line> — <what changes>

## Open questions
- <if issuer was a best-guess, ask user to confirm slug and human-readable label>
- <any sign-convention or category-map ambiguity you couldn't resolve from the sample>
```

After writing the plan, **stop and wait for the user**. Do not start editing. The user may approve, tweak the slug/label, or ask for changes.

---

## Phase 5 — Implement (only after explicit approval)

1. Create a TodoWrite list with one item per file to change.
2. Apply edits in this order so the type system stays green throughout:
   1. `types/index.ts` (add slug + label first — everything else depends on the type).
   2. Refactor A and/or B if triggered (move existing code, then add new branches).
   3. New issuer's category map / row adapter file (if applicable).
   4. `card-detector.ts`, `extractor.ts` (`CARD_PROMPT_HINTS`), `csv-row-parser.ts` aliases.
   5. Wire up: ensure `extraction-pipeline.ts` and `categorizer.ts` pass `cardType` through to the new dispatchers.
3. Mark each todo complete as you go.

### Conventions to follow (non-negotiable — see `DEVELOPER_GUIDE.md`)

- **§2 Structure diagram** — If you create a new file (e.g. `lib/services/issuer-adapters/`), update the tree in `DEVELOPER_GUIDE.md` in the same change.
- **§4 DRY** — Don't extract a helper for a single consumer. If only one issuer has a quirk, keep the quirk in that issuer's adapter.
- **§8 Naming** — Files kebab-case (`chase-freedom.ts` is fine inside `issuer-adapters/`, but matches existing convention in the dir). Types PascalCase. Constants UPPER_SNAKE_CASE.
- **§9 Type safety** — No `any`. Validate any new GPT outputs the same way `extractor.ts` already does (`coerceJson` + `sanitize`).
- **§17 Constants** — No new magic numbers; reuse `lib/constants.ts` for limits.
- **AGENTS.md** — Read `node_modules/next/dist/docs/` before touching anything Next.js-specific (you shouldn't need to for this skill, but if a route changes, check first).
- **Imports** — Use `@/` for cross-directory imports.

### Verification

After all edits:

1. Run `npx tsc --noEmit` to catch type errors. Fix any.
2. Optionally run a manual smoke test by invoking `parseAndPreview` with the sample buffer in a small script — only if the user asks.
3. Report a summary to the user:
   - Which files changed (with line ranges).
   - Whether any DRY refactor was triggered.
   - The new `CardType` slug + label, so the user can confirm it'll show up in the UI dropdowns.
   - Any caveats (e.g. "the sample only had 12 rows; the GPT-prompt hint is a best guess and may need tuning after a larger statement").

---

## What this skill is NOT

- Not a UI generator. If the upload page has a card-type dropdown that needs the new option, point the user at the place to update it but don't redesign the UI.
- Not a parser inventor. If the new issuer ships PDFs with a layout `pdf-parse` can't handle, flag it in the plan rather than silently writing a custom PDF parser. PDF-specific extension is out of scope for this skill — escalate.
- Not a category taxonomy editor. The app's `CATEGORIES` list in `types/index.ts` is fixed. Only map issuer categories *into* that list.
