# Credit Spend Analyser

A full-stack credit-card spend analysis dashboard built on Next.js 16, ShadCN UI, MongoDB, and OpenAI GPT-4o Mini. Upload statements (PDF / CSV / XLS / image), auto-detect the card type (Visa, Discover IT Student, Amex BCP), extract and categorize transactions, then explore spending insights and export reports.

## Setup

1. Copy the env template and fill in values:

   ```bash
   cp .env.example .env.local
   # then edit .env.local
   ```

   Required:
   - `MONGODB_URI` — e.g. `mongodb://localhost:27017/credit-spend`
   - `OPENAI_API_KEY` — for transaction extraction + categorization
   - `AUTH_SECRET` — any 32+ char random string for signing session JWTs

2. Create your first user:

   ```bash
   npx tsx scripts/seed-user.ts --username admin --password <your-password>
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in.

4. If you have transactions imported before dedupe support, backfill keys once:

   ```bash
   npm run backfill:dedupe
   ```

## Features

- **Multi-format upload**: PDF, CSV, XLS/XLSX, JPG/PNG (≤ 20 MB)
- **Auto card detection**: rule-based first, falls back to LLM if ambiguous
- **GPT-4o Mini extraction**: structured JSON output with vision support for images
- **Hybrid categorization**: merchant-rule first pass, GPT for ambiguous merchants
- **Overlap-safe uploads**: re-importing overlapping statement periods skips duplicate transactions automatically
- **Insights**: category breakdown, monthly trend, card comparison, top merchants, MoM change
- **Reports**: filterable CSV/PDF export, statement history
- **Auth**: bcrypt-hashed users, jose-signed JWT cookie, `proxy.ts` guards every route

## Architecture

| Layer | Path |
| --- | --- |
| Auth guard | `proxy.ts` (Next.js 16 replaces middleware) |
| Session helpers | `lib/auth.ts` |
| MongoDB singleton | `lib/db.ts` |
| OpenAI client | `lib/openai.ts` |
| File parsers | `lib/parsers/` (pdf / csv / xls / image) |
| Extraction services | `lib/services/` (card-detector, extractor, categorizer, extraction-pipeline) |
| Mongo models | `lib/models/` |
| Auth pages | `app/(auth)/login/` |
| Dashboard pages | `app/(dashboard)/` (`/`, `/upload`, `/transactions`, `/reports`) |
| API routes | `app/api/` (`auth`, `upload`, `transactions`, `insights`, `statements`, `export`) |

## Notes

- The app router uses async `cookies()` / `params` per Next.js 16.
- ShadCN was initialized with the `base-nova` preset, so primitives use `@base-ui/react` (`render` prop) rather than Radix `asChild`.
- Built and verified with `next build` (Turbopack).
