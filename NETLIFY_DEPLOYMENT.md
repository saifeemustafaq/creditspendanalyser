# Netlify Deployment Guide

This document covers known compatibility issues between this Next.js app and Netlify's serverless platform, along with practical solutions given the constraint that **MongoDB Atlas (free tier) is the only available backend service** — no S3, no Redis, no external queues.

---

## Issue 1: Upload Size Limit (Critical)

### The Problem

The app allows uploads up to **20 MB** (`MAX_UPLOAD_BYTES` in `lib/constants.ts`). Netlify serverless functions have a hard **request body limit of ~6 MB** for synchronous functions. Any upload exceeding this will be rejected by Netlify's infrastructure before your code ever runs.

### Why It Matters

Users trying to upload large PDF statements or multi-month CSVs will get cryptic 413 errors with no recourse.

### Solution

**Lower `MAX_UPLOAD_BYTES` to 4.5 MB** (leaving headroom for base64 encoding overhead and multipart boundaries).

If larger files become necessary in the future, a workaround using MongoDB GridFS is possible:
1. Client splits the file into ~2 MB chunks
2. Each chunk is uploaded to a `/api/upload/chunk` endpoint and stored in GridFS
3. A final `/api/upload/assemble` call triggers processing from the stored chunks

For now, 4.5 MB covers the vast majority of single-month credit card statements (CSVs are typically < 100 KB; PDFs < 3 MB).

---

## Issue 2: Function Timeout (Critical)

### The Problem

Multiple API routes export `maxDuration = 120` (seconds). This is a **Vercel-specific directive** — Netlify ignores it entirely. Netlify function timeouts are:

| Plan     | Default Timeout | Max Configurable |
|----------|-----------------|------------------|
| Free     | 10 seconds      | 10 seconds       |
| Pro      | 10 seconds      | 26 seconds       |
| Business | 10 seconds      | 26 seconds       |

The upload pipeline (parse → extract via OpenAI → categorize) can easily take 15–40 seconds end-to-end.

### Why It Matters

Heavy uploads (PDFs requiring OCR, multi-page statements) will timeout mid-processing, leaving partial or no data in the database.

### Solution

**Split the upload pipeline into discrete, short-lived steps** (already partially done with `/parse`, `/categorize`, `/confirm` routes). Ensure each step independently completes within 10 seconds:

1. **`/api/upload/parse`** — Parse the file into raw text/rows. For CSVs this is instant. For PDFs, if OpenAI vision is needed, this is the bottleneck.
2. **`/api/upload/categorize`** — Send extracted transactions to OpenAI in small batches (5–10 at a time from the client, not all at once).
3. **`/api/upload/confirm`** — Write final data to MongoDB.

**For the audit sampling route** (`/api/transactions/audit/sample`), batch OpenAI calls into groups of 3–5 transactions per request and let the client orchestrate multiple calls.

### Netlify Configuration

Add to `netlify.toml`:

```toml
[functions]
  external_node_modules = ["sharp"]
  node_bundler = "esbuild"

# Extend timeout if on Pro plan
# [functions."api/*"]
#   timeout = 26
```

---

## Issue 3: Memory Pressure from Double Parsing (Moderate)

### The Problem

In `lib/parsers/index.ts`, CSV and XLS files are parsed **twice in parallel** — once for text extraction and once for structured row parsing. Each pass calls `XLSX.read(buffer)` independently, roughly doubling peak memory usage. Netlify functions have a **1024 MB RAM ceiling**.

### Why It Matters

A 4 MB Excel file can balloon to 50–100 MB in-memory when parsed by XLSX. Doing it twice pushes toward the memory limit, especially when combined with other allocations (OpenAI payloads, response buffers).

### Solution

**Serialize the two parsing paths and share the workbook object**, or extract both text and structured data in a single pass. This is a code-level fix in `lib/parsers/index.ts`.

---

## Issue 4: `proxy.ts` Auth Gating (Critical)

### The Problem

Authentication is enforced via `proxy.ts` at the application root. This file acts as a middleware replacement per the project's architecture. However, **Netlify's Next.js adapter (`@netlify/plugin-nextjs`) may not recognize or execute `proxy.ts`** — it expects `middleware.ts` in the standard Next.js location.

### Why It Matters

If `proxy.ts` is not invoked, **all API routes and pages are publicly accessible without authentication**.

### Solution

**Test auth gating in a Netlify Deploy Preview** before going live. If `proxy.ts` is not triggered:

- Option A: Rename `proxy.ts` to `middleware.ts` (standard Next.js convention)
- Option B: Add explicit auth checks at the top of each API route using a shared helper (defense in depth — recommended regardless)

The existing `verifyToken()` function in `lib/auth.ts` can be called directly in route handlers as a fallback guard.

---

## Issue 5: Auth Route Missing Runtime Declaration (Moderate)

### The Problem

`app/api/auth/route.ts` does not export `runtime = "nodejs"`. If the Netlify adapter or a future Next.js version defaults to Edge Runtime for this route, `bcrypt` (used in `lib/models/users.ts`) will crash because it relies on native Node.js bindings.

### Why It Matters

Login and registration will fail with a cryptic "module not found" or "crypto" error.

### Solution

Add to `app/api/auth/route.ts`:

```typescript
export const runtime = "nodejs";
```

---

## Issue 6: PDF Export Memory/Timeout (Low)

### The Problem

`app/api/export/route.ts` generates full PDFs in-memory using jsPDF for up to 10,000 rows. On Netlify's constrained environment, this may exceed timeout or memory limits.

### Why It Matters

Users exporting large date ranges will get timeouts or blank responses.

### Solution

- Lower `EXPORT_MAX_ROWS` to 2,000–3,000 for PDF exports
- CSV exports are lightweight and can stay at higher limits
- Consider client-side PDF generation (jsPDF runs in browsers too) for very large exports

---

## Environment Variables Required

Set these in **Netlify Dashboard → Site Settings → Environment Variables**:

| Variable       | Value                              | Notes                          |
|----------------|------------------------------------|--------------------------------|
| `MONGODB_URI`  | `mongodb+srv://...`                | Atlas connection string        |
| `MONGODB_DB`   | `creditspend`                      | Database name                  |
| `AUTH_SECRET`  | (random 32+ char string)           | For JWT signing                |
| `OPENAI_API_KEY` | `sk-...`                         | For categorization/extraction  |
| `NODE_ENV`     | `production`                       | Usually set automatically      |

---

## Recommended `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## What Already Works Well

These patterns are serverless-compatible and require no changes:

- **MongoDB connection caching** via `globalThis` in `lib/db.ts`
- **No filesystem writes** anywhere in runtime code
- **No child processes** or shell commands
- **No WebSockets** or persistent connections
- **No hardcoded localhost** in application code
- **Stateless API routes** — no cross-request mutable state
- **OpenAI client** — lazy-initialized, warm-reuse safe

---

## Deployment Checklist

- [ ] Reduce `MAX_UPLOAD_BYTES` to 4.5 MB
- [ ] Add `export const runtime = "nodejs"` to auth route
- [ ] Verify `proxy.ts` auth works in Deploy Preview (or convert to `middleware.ts`)
- [ ] Set all environment variables in Netlify dashboard
- [ ] Test upload flow end-to-end (especially PDF parsing timing)
- [ ] Test export with ~1,000 transactions
- [ ] Monitor function logs for timeout errors in first week
- [ ] Consider batching OpenAI calls from the client if timeouts persist
