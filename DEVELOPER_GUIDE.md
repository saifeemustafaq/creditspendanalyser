# Credit Spend Analyser — Developer Guide

Baseline rules for structure, reuse, and conventions. Follow these unless there's a clear reason to deviate.

---

## 1. Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Language | TypeScript (strict mode) | 5 |
| UI | ShadCN (base-nova style) + Tailwind CSS | v4 |
| Icons | Lucide React | — |
| Charts | Recharts (via ShadCN chart component) | — |
| Database | MongoDB (native driver, no Mongoose) | 7 |
| AI | OpenAI GPT-4o Mini | — |
| Auth | JWT via `jose`, password hashing via `bcryptjs` | — |
| Parsing | `pdf-parse`, `xlsx` (CSV + Excel), OpenAI vision (images) | — |
| Export | `jspdf` + `jspdf-autotable` | — |
| Toasts | Sonner | — |
| Theming | `next-themes` (light/dark) | — |
| PWA | Serwist (`@serwist/turbopack`) | — |

---

## 2. Project structure

```
creditspendanalyser/
├── app/
│   ├── (auth)/login/page.tsx           # Public login page
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Sidebar shell for authenticated pages
│   │   ├── loading.tsx                 # Dashboard skeleton
│   │   ├── error.tsx                   # Dashboard error boundary
│   │   ├── page.tsx                    # Main dashboard (charts, insights)
│   │   ├── upload/
│   │   │   ├── page.tsx                # Statement upload (multi-step: drop → review → confirm)
│   │   │   ├── loading.tsx             # Upload page skeleton
│   │   │   └── error.tsx               # Upload page error boundary
│   │   ├── uploads/
│   │   │   ├── page.tsx                # Upload history with categorization stats and delete
│   │   │   ├── loading.tsx             # Uploads page skeleton
│   │   │   └── error.tsx               # Uploads page error boundary
│   │   ├── transactions/
│   │   │   ├── page.tsx                # Transaction list
│   │   │   ├── loading.tsx             # Transactions page skeleton
│   │   │   └── error.tsx               # Transactions page error boundary
│   │   ├── recurring/
│   │   │   ├── page.tsx                # Recurring detection (summary + alerts + table)
│   │   │   ├── loading.tsx             # Recurring page skeleton
│   │   │   └── error.tsx               # Recurring page error boundary
│   │   ├── reports/
│   │   │   ├── page.tsx                # Reports and export (URL-driven filters)
│   │   │   ├── loading.tsx             # Reports page skeleton
│   │   │   └── error.tsx               # Reports page error boundary
│   │   └── coverage/
│   │       ├── page.tsx                # Statement date coverage map (per-card month blocks)
│   │       ├── loading.tsx             # Coverage page skeleton
│   │       └── error.tsx               # Coverage page error boundary
│   ├── api/
│   │   ├── auth/route.ts               # Login / logout / session check
│   │   ├── coverage/route.ts           # GET statement date coverage per card
│   │   ├── coverage/settings/route.ts  # PATCH card open date / track card
│   │   ├── upload/
│   │   │   ├── _helpers.ts             # Shared formData + file validation for upload routes
│   │   │   ├── route.ts                # Legacy single-shot upload (parse + save)
│   │   │   ├── parse/route.ts          # Phase 1: parse + categorize (no DB write)
│   │   │   ├── categorize/route.ts     # AI categorization for ambiguous rows
│   │   │   └── confirm/route.ts        # Phase 2: persist reviewed transactions
│   │   ├── statements/route.ts         # Statement history
│   │   ├── statements/[id]/route.ts    # Bulk delete statement + its transactions
│   │   ├── recurring/route.ts          # GET detected recurring summary
│   │   ├── recurring/overrides/route.ts # POST/DELETE user recurring overrides
│   │   ├── transactions/route.ts       # CRUD transactions
│   │   ├── transactions/audit/sample/route.ts   # Audit: sample + AI cross-check
│   │   ├── transactions/audit/resolve/route.ts  # Audit: persist resolutions
│   │   ├── insights/route.ts           # Aggregated insights
│   │   └── export/route.ts             # CSV / PDF export
│   ├── error.tsx                        # Root error boundary (catch-all)
│   ├── ~offline/page.tsx                # Public offline fallback (PWA)
│   ├── manifest.ts                      # Web App Manifest (MetadataRoute)
│   ├── icon.tsx                         # Favicon (ImageResponse)
│   ├── apple-icon.tsx                   # Apple touch icon (ImageResponse)
│   ├── sw.ts                            # Serwist service worker source
│   ├── serwist/[path]/route.ts          # Serwist SW build route (/serwist/sw.js)
│   ├── icons/icon-192/route.tsx         # Manifest icon 192×192
│   ├── icons/icon-512/route.tsx         # Manifest icon 512×512
│   ├── icons/icon-maskable-512/route.tsx # Maskable icon for Android
│   ├── layout.tsx                       # Root layout (fonts, providers, MobileToaster, Serwist)
│   └── globals.css                      # Tailwind v4 + ShadCN theme tokens
├── components/
│   ├── ui/                              # ShadCN-generated UI primitives (do not modify)
│   ├── app-sidebar.tsx                  # Dashboard sidebar navigation
│   ├── audit-dialog.tsx                 # Category audit dialog (config + state machine)
│   ├── audit-results-view.tsx           # Audit results view (disagreements + matches)
│   ├── audit-response-parser.ts         # Runtime parser for /audit/sample response
│   ├── audit-types.ts                   # Client-side audit types (re-exports server shapes from audit-service)
│   ├── card-badge.tsx                   # Tinted card-type label using CARD_COLORS
│   ├── coverage-card-panel.tsx          # Per-card coverage row with open-date input
│   ├── coverage-timeline.tsx            # Month-block statement coverage timeline
│   ├── category-badge.tsx               # Tinted category label using CATEGORY_COLORS
│   ├── dashboard-filters.tsx            # Date range + card type filter bar
│   ├── insight-charts.tsx               # Dashboard chart components
│   ├── mobile-bottom-nav.tsx            # Fixed bottom tab bar for mobile primary routes
│   ├── mobile-filter-bar.tsx            # Collapsible filter sheet on mobile, inline on desktop
│   ├── mobile-more-sheet.tsx            # Secondary routes + sign out (mobile More tab)
│   ├── mobile-page-header.tsx           # Dashboard header with contextual mobile page title
│   ├── mobile-toaster.tsx               # Responsive Sonner placement (mobile vs desktop)
│   ├── dashboard-pwa-install-banner.tsx # Mobile-only install banner wrapper for dashboard
│   ├── pwa-install-banner.tsx           # Dismissible PWA install banner (Chromium + iOS)
│   ├── pwa-ios-install-sheet.tsx        # iOS Safari Add to Home Screen instructions
│   ├── serwist-provider.tsx             # Client wrapper for SerwistProvider (SW registration)
│   ├── table-scroll-region.tsx          # Horizontal scroll wrapper for wide tables on mobile
│   ├── transaction-row-card.tsx         # Mobile card layout for transaction rows
│   ├── recurring-add-dialog.tsx         # "Add recurring" dialog (manual include action)
│   ├── recurring-alerts.tsx             # Alert banner cards on the recurring page
│   ├── recurring-items-table.tsx        # Recurring items table + row actions
│   ├── recurring-override-dialog.tsx    # Frequency-override dialog
│   └── upload-review-table.tsx          # Upload review table with inline category editing
├── hooks/
│   ├── use-container-width.ts             # ResizeObserver hook for responsive chart layout
│   ├── use-logout.ts                    # Sign-out handler (shared by sidebar + mobile More sheet)
│   ├── use-mobile.ts                    # Responsive breakpoint hook (uses MOBILE_BREAKPOINT)
│   ├── use-pwa-install.ts               # beforeinstallprompt + iOS install detection
│   ├── use-standalone.ts                # display-mode: standalone detection (incl. iOS)
│   └── use-upload-wizard.ts            # Multi-step upload wizard state + handlers
├── lib/
│   ├── db.ts                            # MongoDB connection singleton
│   ├── openai.ts                        # OpenAI client singleton
│   ├── auth.ts                          # JWT sign / verify / session helpers
│   ├── constants.ts                     # App-wide constants (limits, colors, breakpoints, frequencies)
│   ├── format.ts                        # Currency and date formatting helpers
│   ├── mobile-dialog.ts                 # Shared dialog classes for mobile-friendly overlays
│   ├── nav.ts                           # Shared nav items, primary/secondary split, page titles
│   ├── pwa-icon-art.tsx                 # Shared ImageResponse art for favicon/manifest icons
│   ├── pwa-runtime-cache.ts             # Secure Serwist runtime caching (static assets only)
│   ├── range.ts                         # Date range utilities + parseDate() + isRangeKey()
│   ├── utils.ts                         # cn() helper (clsx + tailwind-merge)
│   ├── parsers/                         # File format parsers
│   │   ├── pdf-parser.ts
│   │   ├── csv-parser.ts                # Plain-text CSV rendering
│   │   ├── csv-row-parser.ts            # Structured CSV/XLS row extraction (no AI)
│   │   ├── xls-parser.ts
│   │   ├── image-parser.ts
│   │   └── index.ts                     # Unified parseFile() router
│   ├── services/                        # Business logic services
│   │   ├── audit-service.ts             # runAuditSample() + shared DisagreementRow/MatchRow types
│   │   ├── card-detector.ts             # Auto-detect card type
│   │   ├── extractor.ts                 # GPT-4o Mini extraction prompts
│   │   ├── export-service.ts            # CSV + PDF generation for /api/export
│   │   ├── merchant-normalizer.ts       # Strip noise from raw descriptions
│   │   ├── category-mapper.ts           # Per-issuer category → app-category dispatch (Tier 1)
│   │   ├── categorizer.ts               # Tiered categorization (override/source/rule/AI)
│   │   ├── extraction-pipeline.ts       # parseAndPreview() + confirmAndSave()
│   │   ├── transaction-dedupe.ts        # dedupeKey + overlap detection for uploads
│   │   ├── transaction-dedupe.test.ts   # Unit tests for deduplication logic
│   │   ├── recurring-detector.ts        # Pure recurring detection (clustering + scoring + alerts)
│   │   └── issuer-adapters/             # Per-issuer StructuredRow → ExtractedTransaction
│   │       ├── types.ts                 # RowAdapter type
│   │       ├── discover.ts              # Discover-style sign convention
│   │       ├── chase.ts                 # Chase Sapphire (Type column + inverted sign)
│   │       ├── amex.ts                  # Amex BCP (Discover-style sign + description-based payment detection)
│   │       ├── robinhood.ts             # Robinhood Gold Card (Type column; skips Pending rows)
│   │       └── index.ts                 # getRowAdapter(cardType) dispatch
│   └── models/                          # MongoDB collection access + queries
│       ├── users.ts
│       ├── statements.ts
│       ├── transactions.ts
│       ├── coverage.ts                  # Statement date coverage aggregation per card
│       ├── card-settings.ts             # Per-card open date for coverage tracking
│       ├── category-overrides.ts        # Persisted user category corrections
│       └── recurring.ts                 # Recurring detection + override CRUD
├── types/
│   └── index.ts                         # Shared TypeScript types
├── scripts/
│   ├── seed-user.ts                     # CLI to create user in MongoDB
│   ├── reset-password.ts                # CLI to update a user's password hash
│   └── backfill-dedupe-keys.ts          # One-time dedupeKey backfill + index
├── proxy.ts                             # Auth guard (Next.js 16 convention)
├── components.json                      # ShadCN configuration
├── tsconfig.json
├── package.json
├── .env.example                         # Environment variable template (commit this)
└── .env.local                           # Environment variables (not committed)
```

### Grouping philosophy

- **Group by feature/domain** (parsers, services, models) rather than only by type.
- **Co-locate** related code. Types, helpers, and sub-components that belong to one feature live with that feature.
- **Don't extract to shared** unless there are **2+ distinct consumers**.

### Keeping the structure diagram current

When you add a new file that introduces a new route, service, or utility module, **update this tree** in the same PR. The structure diagram is the first thing a new contributor reads — if it's stale, it's useless.

---

## 3. Structure & components

- **One component/feature per file** — Each component or feature lives in its own file. No dumping unrelated UI or logic into a single file.
- **Clear ownership** — Every file has a single, nameable responsibility.
- **UI components** — Use ShadCN as the primary component library. Add components via `npx shadcn@latest add <name>`; customize in `components/ui/`.
- **Do not modify ShadCN-generated files** in `components/ui/`. If you need custom behavior, wrap the ShadCN component in a new file outside `components/ui/`.

---

## 4. DRY (Don't Repeat Yourself)

- **Reuse first** — Before adding new code, check for existing components, hooks, or utilities you can reuse.
- **Shared code** — Extract only when used by **2+ distinct modules**. If used by one module, keep it in that module.
- **Watch for helper duplication across API routes.** If multiple routes define the same helper function (e.g. date parsing, input validation), extract it into `lib/` immediately. API routes are a common source of copy-paste drift.

---

## 5. File size (LOC)

- **Target:** Most source files **<= 300 lines**.
- **LOC is a signal, not the goal** — Going over 300 is allowed when it improves cohesion or readability.
- **Do not split only to hit 300** if the result is worse: more files to open, duplicated types, circular deps, or pass-through wrappers.
- **Heuristic:** If you need to open **3+ files** to understand one flow, you probably split too much.
- **Exception:** ShadCN-generated files in `components/ui/` (e.g. `sidebar.tsx`, `chart.tsx`) may exceed 300 lines. Do not refactor them.

---

## 6. When to split a file

Split only when there's a **real boundary**:

- Different responsibilities (e.g. parsing vs. extraction vs. categorization).
- Stable interfaces (e.g. service vs. data layer).
- Reusable component with a clear owner.
- Domain sub-area you can name clearly (e.g. card detection vs. transaction extraction).

Every new file must answer: **"What is its single responsibility?"**

---

## 7. Helpers & shared code

- **Prefer vertical slices over generic helpers** — Avoid `utils/helpers/common/misc` only to move lines out.
- A helper is valid only if it's either:
  - **Domain-specific** (e.g. `lib/range.ts` for date range utilities, amount formatting), or
  - **Truly general** and used by **2+ distinct modules**.
- **Single consumer** -> keep it co-located (same folder or same file).
- **Date parsing / formatting** — Use `lib/range.ts` for all date range logic. Do not re-implement date helpers in individual API routes or page components.

---

## 8. Naming conventions

| Category | Convention | Examples |
|----------|-----------|----------|
| Files | kebab-case | `card-detector.ts`, `extraction-pipeline.ts` |
| Components | PascalCase | `UploadDropzone`, `SpendingChart` |
| Functions / variables | camelCase | `parseFile`, `detectCardType` |
| Types / interfaces | PascalCase | `Transaction`, `StatementUpload` |
| Constants | UPPER_SNAKE_CASE | `SUPPORTED_FILE_TYPES`, `CATEGORY_LIST` |

- **Be consistent within a group.** If every parser file is named `<format>-parser.ts`, new additions must follow the same pattern.
- **Output filenames and asset paths** should follow the same conventions already established.

---

## 9. TypeScript & type safety

- **Strict mode is on** (`strict: true` in `tsconfig.json`). Do not weaken it.
- **Avoid `any`** — Use `unknown` and narrow with type guards or assertions. If `any` is truly unavoidable, add an `// eslint-disable` comment with a justification.
- **Prefer `type` over `interface`** unless you need declaration merging. Be consistent within a file — do not mix `type` and `interface` for similar shapes in the same module.
- **Shared types** live in `types/`. Feature-specific types can be co-located with the feature.
- **Derive types from Zod schemas** when validation schemas are present, using `z.infer<typeof schema>`.

### Type assertion discipline

- **Do not use `as` to cast parsed JSON.** When parsing external data (e.g. GPT responses, request bodies), validate the shape at runtime before trusting it. Use a type guard, Zod schema, or explicit field checks.

  ```ts
  // Bad — trusts the shape blindly
  const parsed = JSON.parse(content) as { results: SomeType[] };

  // Good — validates before using
  const raw: unknown = JSON.parse(content);
  if (!isValidExtractionResult(raw)) throw new Error("Unexpected GPT output");
  ```

### Index signatures

- **Avoid widening types with `[key: string]: unknown`** on interfaces. If a type needs to be extensible, use a discriminated union or generic instead. Loose index signatures defeat the purpose of strict mode.

### Explicit return types on complex functions

- Functions that return complex objects (especially aggregation results from MongoDB) should have **explicit return type annotations**. This prevents accidental shape drift and makes the contract readable without tracing the implementation.

---

## 10. Imports

- **Use `@/` for cross-directory imports.** The path alias `@/*` maps to the project root. This applies **everywhere**, including scripts.

  ```ts
  // Good
  import { Button } from "@/components/ui/button";
  import { getDb } from "@/lib/db";

  // Bad — even in scripts/
  import { createUser } from "../lib/models/users";
  ```

- **Relative imports** are fine for files in the **same directory** (e.g. `./types`, `./helpers`).
- **React imports** — In custom code, use direct named imports: `import { useState, useCallback } from "react"`. Do not modify ShadCN-generated files; they follow their own conventions.
- **`import type`** — Use `import type` when importing only types to keep runtime bundles clean.
- **Limit import sprawl** — If a file has **> ~15 imports** after a refactor, reconsider the structure.

---

## 11. Next.js 16 conventions

This project uses **Next.js 16**, which has breaking changes from earlier versions. Always read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

### Auth guard: `proxy.ts`

Next.js 16 replaces `middleware.ts` with `proxy.ts` at the project root. This is the auth guard:

- Check for a valid session cookie on all `/(dashboard)` routes.
- Redirect to `/login` if unauthenticated.
- Allow `/login`, `/api/auth`, and static assets through.
- For unauthenticated API requests, return `{ error: "Unauthorized" }` with status `401` (do not redirect).

**Do not create a `middleware.ts` file.** It is deprecated in Next.js 16.

### Route groups

- `(auth)` — Public routes (login).
- `(dashboard)` — Protected routes behind the auth guard.

### API routes

- Use the App Router `route.ts` convention with named `GET`, `POST`, `DELETE` exports.
- Auth: use `getSession()` from `lib/auth.ts` to verify the session. Return `401` immediately if `null`.

### Server components vs. client components

- **Default to server components.** Only add `"use client"` when you need browser APIs, event handlers, or React hooks (`useState`, `useEffect`, etc.).
- **`dynamic = "force-dynamic"`** — Use on server-component pages that need fresh data on every request (e.g. the dashboard). Do not use it on static pages.

---

## 12. Database conventions

The app uses **MongoDB** via the native Node.js driver (not Mongoose).

### Connection management

- **Singleton client** — `lib/db.ts` maintains a single `MongoClient` promise cached on `globalThis` to survive hot reloads in dev and reuse connections across serverless invocations.
- **Never create a second client.** Always use `getDb()` and the `COLLECTIONS` constant from `lib/db.ts`.

### Collections

| Collection | Purpose |
|-----------|---------|
| `users` | User accounts (username, passwordHash) |
| `statements` | Uploaded statement metadata (card type, file format, dates) |
| `transactions` | Individual transactions (merchant, amount, category, card type, optional `dedupeKey`) |
| `category_overrides` | Persisted merchant → category corrections (re-applied on future uploads) |
| `recurring_overrides` | User decisions for recurring detection (include / dismiss / frequency_override) |
| `card_settings` | Per-card open date for coverage tracking (excludes pre-open periods from missing-date alerts) |

### Collection access pattern

Access collections via `getDb()` and the `COLLECTIONS` constant:

```ts
import { getDb, COLLECTIONS } from "@/lib/db";

const db = await getDb();
const txns = db.collection(COLLECTIONS.transactions);
```

All query logic for a collection lives in the corresponding file under `lib/models/` (e.g. `lib/models/transactions.ts` for aggregation pipelines). API routes call model functions — they do not build raw queries themselves.

### Database name

The database name defaults to `"credit-spend"` and can be overridden via the `MONGODB_DB` environment variable. Do not hardcode a different database name elsewhere in the code.

### Schema patterns

- **Separate collections** — Users, statements, and transactions are separate collections linked by `userId` and `statementId` (ObjectId references).
- **Required fields** — Every document has `_id` (ObjectId) and appropriate foreign keys.
- **Schema evolution** — MongoDB is schema-less, but TypeScript types are the schema. When adding fields, make them optional and handle missing fields gracefully in code.

### Transaction deduplication (overlapping uploads)

- **`dedupeKey`** — Stable fingerprint on each transaction: `cardType`, dates (ISO day strings), `type`, amount in cents, normalized merchant, and a hash of `rawDescription`. Computed in [`lib/services/transaction-dedupe.ts`](lib/services/transaction-dedupe.ts).
- **Parse** — `parseAndPreview()` marks rows `isDuplicate` / `duplicateReason` (`existing` | `in_file`) for the review UI.
- **Confirm** — `confirmAndSave()` skips duplicates (keeps existing DB rows). No statement record is created if every row is a duplicate (`allDuplicates`).
- **Index** — Sparse unique `{ userId: 1, dedupeKey: 1 }` via `ensureTransactionIndexes()` in [`lib/db.ts`](lib/db.ts). Legacy rows without `dedupeKey` are ignored by the index until backfilled.
- **Backfill** — Run `npm run backfill:dedupe` once on databases that already had transactions before this feature. Resolve any reported key collisions (true duplicate rows from past double uploads) before relying on the unique index.
- **Tradeoff** — Two distinct purchases with identical date, amount, merchant, and raw line on the same card will be treated as one; rare in practice.

---

## 13. API route conventions

Every API route handler **must** follow this structure:

```ts
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ... route logic ...

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/<route> failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

### Mandatory rules

1. **Top-level try/catch** — Every exported handler (`GET`, `POST`, `DELETE`, etc.) must have a try/catch wrapping the **entire** body. Not just around JSON parsing or one sub-call — the whole thing.

2. **`catch (err)`** — Always name the catch parameter `err`. Never use an anonymous `catch { }` block except for intentional swallowing (e.g. JWT verification returning `null`), and even then, add a brief comment explaining why.

   ```ts
   // Bad — silent swallow, no variable, no log
   catch {
     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
   }

   // Good
   catch (err) {
     console.error("JSON parse failed:", err);
     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
   }
   ```

3. **`console.error` in every catch** — Always log with enough context to identify the route and operation. Include the route path in the log message.

4. **Error shape: `{ error: string }`** — Every error response must use this shape. Do not use alternative shapes like `{ authenticated: false }`, `{ message: string }`, or `{ success: false }`. Status-check endpoints that return boolean state should still use `{ error: string }` for the failure case:

   ```ts
   // Bad
   return NextResponse.json({ authenticated: false }, { status: 401 });

   // Good
   return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
   ```

5. **No business logic in routes** — Routes orchestrate (parse input, call service/model, return response). If your route is building CSV strings, laying out PDF pages, computing aggregations, or doing anything that takes more than ~10 lines of domain logic, move it into `lib/services/` or `lib/models/`.

6. **Auth check first** — Protected routes call `getSession()` as the very first thing inside the try block. Return `401` before doing any work.

---

## 14. Error handling

### Server-side

- **Catch variable:** Always name it `err`.
- **Always log:** `console.error` in every catch block in API routes, with the route name as context.
- **Anonymous `catch { }`** — Only acceptable in two cases:
  1. **Security-sensitive operations** where logging would leak tokens (e.g. `verifyToken` returning `null`). Add a comment: `// Intentionally silent — invalid token is not an error`.
  2. **Input parsing fallbacks** where the error is expected and the response is clear (e.g. malformed JSON returns 400). Even then, prefer `catch (err)` with a log.

### Client-side

- **Every `fetch` call must handle errors.** After a fetch, check `response.ok` and surface failures to the user via `toast.error(...)` from Sonner.
- **Never silently swallow fetch failures.** If a network request fails, the user must know.

  ```ts
  // Bad — user sees nothing on failure
  const res = await fetch("/api/transactions");
  const data = await res.json();

  // Good
  const res = await fetch("/api/transactions");
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    toast.error(body.error ?? "Something went wrong");
    return;
  }
  const data = await res.json();
  ```

### Custom error classes

When a module needs structured error codes (e.g. parsing failures), extend `Error` with a `code` field. Keep it in the module that owns the concern.

---

## 15. UI & design conventions

- **ShadCN is the design system.** Use ShadCN components for all standard UI patterns. Do not build custom versions of things ShadCN already provides.
- **Icons** — Use **Lucide React only**. Do not use emoji in the UI, copy, or code.
- **Responsive** — The sidebar collapses to a sheet/drawer on mobile. All pages must work on both desktop and mobile viewports. See [Mobile layout conventions](#mobile-layout-conventions) below.
- **Dark mode** — Supported via CSS variables and `next-themes`. The theme tokens are defined in `app/globals.css` using `oklch` color space. `ThemeProvider` from `next-themes` **must** be mounted in the root `app/layout.tsx` wrapping the page content for `useTheme()` to work in any component.
- **Loading states** — Every route segment under `(dashboard)/` must have a `loading.tsx` with ShadCN `Skeleton` components. Auth routes (`(auth)/`) should also have loading states if they perform async work.
- **Error states** — Every route segment under `(dashboard)/` must have an `error.tsx` boundary. The root `app/` should also have an `error.tsx` as a catch-all.
- **Toasts** — Use Sonner for all user feedback (upload success, export ready, errors). The `<MobileToaster />` is mounted in root `layout.tsx`.
- **Charts** — Use the ShadCN `chart` component (wraps Recharts). Chart colors use the `--chart-1` through `--chart-5` CSS variables.

### Mobile layout conventions

Mobile work is **additive** — desktop behavior at `md` (768px) and above must not regress. Full rules live in `.cursor/plans/mobile_optimization.plan.md` (Hard rule: desktop parity).

| Concern | Convention |
|---------|--------------|
| **Breakpoint** | `MOBILE_BREAKPOINT = 768` in `lib/constants.ts`. Tailwind: `md:` = desktop. Prefer **`md:hidden` / `hidden md:block`** over JS when possible. |
| **Shell** | `(dashboard)/layout.tsx`: mobile inner scroll + bottom nav padding; **desktop uses document scroll** (`max-md:` scroll trap only). |
| **Navigation** | `MobileBottomNav` + `MobileMoreSheet` (`md:hidden`). Desktop: `AppSidebar` only. Nav config: `lib/nav.ts`. |
| **Header** | `MobilePageHeader`: page title on mobile, app name + `SidebarTrigger` on desktop. |
| **Filters** | `MobileFilterBar`: inline `hidden md:flex` on desktop; bottom sheet on mobile. Lazy-render sheet content when open. |
| **Tables** | Interactive lists → card component (`TransactionRowCard`, etc.) with `md:hidden`; table with `hidden md:block`. Read-only wide tables → `TableScrollRegion`. |
| **Charts** | `useContainerWidth()` (`hooks/use-container-width.ts`) for container-aware sizing; Tailwind `md:max-h-*` / `md:h-*` for desktop heights. |
| **Dialogs** | Import classes from `lib/mobile-dialog.ts`: `mobileDialogContentClass`, `mobileDialogFooterClass`, `mobileDialogDescriptionClass`. Dynamic text (merchant names, filenames) must wrap — never rely on button `whitespace-nowrap`. |
| **Toasts** | `MobileToaster` uses `useIsMobile()` for position (acceptable one-time hydration flash). |
| **Safe areas** | `pt-safe`, `pb-safe` in `globals.css`; `--bottom-nav-height` for bottom inset. |
| **Touch targets** | Primary actions ≥ 44px on mobile (`min-h-11`, `size-11` for icon buttons). |
| **Loading skeletons** | Match page layout: single-column cards on mobile, table/grid on `md+` (see `transactions/loading.tsx`). |

**When to use `useIsMobile` vs Tailwind-only**

- **Tailwind-only** — Show/hide components, column counts, padding, scroll behavior.
- **`useIsMobile` / `useContainerWidth`** — When behavior depends on exact width (toast position, chart radii, axis rotation) or container size in a grid column.

### PWA conventions

The app is installable as a PWA on iOS, Android, and desktop Chromium browsers. Offline **data** (transactions, dashboard) is intentionally **not** cached — only static assets and the public offline page.

| Concern | Convention |
|---------|--------------|
| **Manifest** | `app/manifest.ts` — `display: standalone`, icons at `/icons/icon-*` routes. |
| **Icons** | `app/icon.tsx`, `app/apple-icon.tsx`, `lib/pwa-icon-art.tsx` — shared chart/card motif. Theme colors: `PWA_THEME_COLOR`, `PWA_THEME_COLOR_DARK` in `lib/pwa-icon-art.tsx`. |
| **Service worker** | `app/sw.ts` + `app/serwist/[path]/route.ts` → `/serwist/sw.js`. Registered via `SerwistProviderWrapper` in root layout. **Disabled in development** (`NODE_ENV === "development"`). |
| **Caching security** | `lib/pwa-runtime-cache.ts` — static assets only. **`NetworkOnly` for `/api/*`, HTML, and RSC.** Never use stock `defaultCache` wholesale. |
| **Offline fallback** | Public route `app/~offline/page.tsx`. Precached; shown when navigation fails offline. |
| **Auth / proxy** | `proxy.ts` public paths: `/login`, `/~offline`, `/serwist/*`, `/icons/*`, `/manifest.webmanifest`, `/api/auth`. |
| **Install UX** | `PwaInstallBanner` in dashboard layout (`md:hidden`). iOS: `PwaIosInstallSheet` via More sheet. Dismiss state: `localStorage` key `pwa-install-dismissed`. |
| **Standalone** | `useStandalone()` — hide install UI when `display-mode: standalone` or `navigator.standalone` (iOS). |
| **Production** | PWA features require **HTTPS** (or `localhost`). Run Lighthouse PWA audit against `next build && next start`. |

**Cross-browser QA checklist**

| Platform | Browser | Verify |
|----------|---------|--------|
| iPhone | Safari | Add to Home Screen → standalone launch, icon, safe areas |
| iPhone | Chrome | Install or A2HS fallback sheet |
| Android | Chrome | Install prompt, standalone, theme color |
| Android | Firefox | Manifest + SW register, offline page |
| Desktop | Chrome / Brave / Edge | Install from omnibox, standalone window |
| Desktop | Firefox | Manifest served, SW registers |
| All | DevTools → Application | `/api/*` not in Cache Storage; `/serwist/sw.js` active in production |

---

## 16. Styling approach

- **Tailwind CSS v4** — No `tailwind.config.ts`. Configuration is done via `@theme inline` in `app/globals.css`.
- **ShadCN tokens** — All design tokens (colors, radii, sidebar variables) are CSS custom properties defined in `globals.css` with light/dark variants.
- **`cn()` for conditional classes** — Always use `cn()` from `@/lib/utils` for conditional or dynamic class composition. Do not use template literal string interpolation for conditional Tailwind classes.

  ```tsx
  // Bad — template literal class composition
  <div className={`border-2 ${dragOver ? "border-primary" : "border-muted"}`}>

  // Good — cn() for conditional composition
  <div className={cn("border-2", dragOver ? "border-primary" : "border-muted")}>
  ```

- **Inline styles** — Avoid. Use Tailwind utility classes exclusively. The only exceptions are ShadCN-generated files that use inline `style` for CSS variable bridging (e.g. `sonner.tsx`, `chart.tsx`). Do not add new inline styles in app code.

---

## 17. Constants & magic values

- **No magic numbers or strings in business logic.** If a literal value appears in more than one place, or carries domain meaning, extract it into a named constant.
- **Co-locate or centralize** — Single-module constants live at the top of that file. Shared constants go in a dedicated constants file.
- **Environment-dependent values** (URLs, API keys, feature flags) come from environment variables, not hardcoded strings.

### Shared constants must be imported, not duplicated

When a value like a file size limit or row cap is used in both the API route and the client component, define it **once** in a shared location and import it in both places.

```ts
// Bad — duplicated magic number
// In app/api/upload/route.ts:
const MAX_BYTES = 20 * 1024 * 1024;
// In app/(dashboard)/upload/page.tsx:
if (file.size > 20 * 1024 * 1024) { ... }

// Good — single source of truth
// In lib/constants.ts (or co-located with the feature):
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Imported in both the route and the page component.
```

### Named constant candidates

Any of these appearing as bare literals should be extracted:

- File size limits (bytes)
- Row/page limits for queries and exports
- Bcrypt salt rounds
- Text truncation / slicing limits for GPT prompts
- Model names (e.g. `"gpt-4o-mini"`)

### Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `MONGODB_DB` | Database name override (default: `"credit-spend"`) | No |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o Mini | Yes |
| `AUTH_SECRET` | Secret for JWT signing/verification | Yes |

These live in `.env.local` (not committed). A `.env.example` template **must** exist in the repo documenting all variables with placeholder values.

---

## 18. Services & business logic

### Extraction pipeline

The upload flow is orchestrated by `lib/services/extraction-pipeline.ts`:

1. **Parse file** — Route to correct parser based on MIME type (`lib/parsers/`).
2. **Detect card type** — Regex/keyword-based first, GPT fallback for ambiguous cases (`lib/services/card-detector.ts`).
3. **Extract transactions** — Card-type-specific GPT-4o Mini prompts for structured JSON output (`lib/services/extractor.ts`).
4. **Categorize transactions** — Rule-based matching first, GPT batch fallback for ambiguous merchants (`lib/services/categorizer.ts`).
5. **Detect duplicates** — Compare against existing `dedupeKey` values and within-file repeats (`lib/services/transaction-dedupe.ts`).
6. **Store in MongoDB** — Save statement + new transactions only; record skip counts in `uploadStats`.

### Card types

| Card | Detection markers |
|------|-------------------|
| Visa | "Visa", card number patterns, layout cues |
| Discover IT Student | "Discover", "Cashback Bonus", student card markers |
| Amex Blue Cash Preferred | "American Express", "Blue Cash Preferred", membership format |
| Chase Sapphire Preferred | "Chase" + "Sapphire"/"Chase Travel", or Chase CSV header signature (`Type` + `Memo` columns) |

### Transaction categories

Groceries, Dining, Gas/Fuel, Entertainment, Shopping, Travel, Subscriptions, Utilities, Healthcare, Insurance, Education, Personal Care, Home, Rent, Phone/Internet, Government, Transportation, Fees/Interest, Payment/Credit, Other.

### Pure functions

- Parsers and categorization rules must be pure — no I/O, no mutations of external state, deterministic output.
- OpenAI calls are the exception (side-effectful by nature), but should be isolated in their own functions with clear input/output contracts.

### Export logic

CSV generation, PDF layout, and report formatting are **services**, not route concerns. If an export route grows beyond simple orchestration, extract the generation logic into `lib/services/export-service.ts`.

---

## 19. Exports

- **`export default`** — Only for Next.js pages, layouts, loading, and error files (required by the framework).
- **Named exports everywhere else** — Components, hooks, utilities, types, constants.

---

## 20. Supported file formats

| Format | Library | Notes |
|--------|---------|-------|
| PDF | `pdf-parse` | Extract raw text from buffer |
| CSV | `xlsx` | Handles CSV as a subset |
| XLS/XLSX | `xlsx` | Parse into row arrays |
| JPG/PNG | OpenAI vision | Convert to base64, send to GPT-4o Mini |

File size cap: **20 MB** (defined as `MAX_UPLOAD_BYTES` — see §17).

---

## 21. Client-side data fetching

- **No global state library.** Client pages use `useState` + `useEffect` + `fetch` for data.
- **Always handle loading, error, and empty states.** Every fetch-driven page must show:
  - A loading indicator while the request is in flight.
  - A toast or inline error message if the request fails.
  - A meaningful empty state if the response has no data.
- **URL-driven filters** — Dashboard filters (date range, card type) are stored in URL search params via `useSearchParams`, not in component state. This makes filtered views shareable and bookmarkable.

---

## Quick checklist

| Do | Don't |
|----|-------|
| One clear responsibility per file | Split only to hit 300 LOC |
| Reuse components and shared logic | Duplicate helpers across API routes |
| Split on clear seams (responsibility, interface, domain) | Create pass-through or re-export-only files |
| Co-locate code used by one module | Extract to "shared" for a single consumer |
| Keep imports and dependency depth under control | Let refactors create 15+ imports or cycles |
| Use ShadCN and Lucide React for all UI | Use emoji or ad-hoc UI libraries |
| Follow naming conventions (kebab-case files, PascalCase types) | Invent new naming patterns per file |
| Use `@/` for cross-directory imports (including scripts) | Use deep relative paths (`../../..`) |
| Avoid `any`; use `unknown` + narrowing | Use `as SomeType` on parsed JSON without validation |
| Validate parsed JSON shapes at runtime | Trust `as` casts on GPT responses or request bodies |
| Extract repeated literals into named constants | Duplicate magic numbers across route + client |
| Keep parsers and categorization rules pure | Mix DB calls or fetch into parser/rule functions |
| Access MongoDB through `getDb()` + `COLLECTIONS` | Create a second `MongoClient` or bypass the singleton |
| Wrap every API handler in top-level try/catch | Leave routes without error handling |
| Name catch variable `err`; always `console.error` | Use anonymous `catch { }` without logging |
| Return `{ error: string }` for all API error responses | Use `{ authenticated: false }` or other shapes |
| Move heavy logic (CSV/PDF generation) to `lib/services/` | Build export/report logic inside route handlers |
| Use `cn()` for conditional Tailwind classes | Use template literal interpolation for class names |
| Surface all fetch failures via `toast.error()` | Silently swallow failed network requests |
| Mount `ThemeProvider` in root layout | Rely on `useTheme()` without a provider |
| Add `loading.tsx` + `error.tsx` for every route segment | Skip loading/error states for dashboard routes |
| Preserve desktop parity when adding mobile UI (`md:` isolation) | Replace desktop layouts with mobile-only patterns |
| Use `lib/mobile-dialog.ts` for dialogs with dynamic text | Put long unbreakable strings in dialog buttons |
| Keep PWA SW from caching `/api/*` or authenticated HTML | Use stock Serwist `defaultCache` without filtering |
| Register PWA public paths in `proxy.ts` | Block `/serwist/sw.js` or `/~offline` behind auth |
| Use `proxy.ts` for auth guarding (Next.js 16) | Use `middleware.ts` (deprecated in Next.js 16) |
| Use named exports; `export default` only for pages | Default-export components or utilities |
| Keep `.env.example` in sync with all required env vars | Add env vars without updating the template |
| Read `node_modules/next/dist/docs/` for Next.js 16 APIs | Assume Next.js conventions from older versions |

---

*Keep this guide open when making structure or refactor decisions.*
