---
name: Upload logging and delete
overview: Add upload-level stats tracking (categorization breakdown) to each statement at confirm time, a new Upload History page in the sidebar, and a bulk-delete API + UI to remove all transactions from a specific upload.
todos:
  - id: extend-types
    content: Add UploadStats interface and optional field on StatementDoc in types/index.ts
    status: pending
  - id: update-statements-model
    content: Update InsertStatementInput to accept uploadStats, add deleteStatement() to lib/models/statements.ts
    status: pending
  - id: compute-stats
    content: Compute uploadStats in confirmAndSave() and pass to insertStatement in extraction-pipeline.ts
    status: pending
  - id: delete-api
    content: Create DELETE /api/statements/[id] route for bulk delete by upload
    status: pending
  - id: uploads-page
    content: Create /uploads page with stats table, categorization breakdown, and delete-with-confirmation UI
    status: pending
  - id: sidebar-nav
    content: Add Uploads nav item to app-sidebar.tsx
    status: pending
isProject: false
---

# Upload Logging and Bulk Delete

## Design Decisions

- **Stats snapshot, not event log** -- Record a categorization breakdown once at confirm time. This is cheap, queryable, and covers the use case without a separate collection.
- **Overrides survive deletion** -- Deleting an upload removes the statement and its transactions but does NOT touch `category_overrides`. Learned knowledge persists.
- **New "Uploads" sidebar page** -- Upload history is a distinct concept from transactions or reports. It gets its own `/uploads` route with a table of past uploads showing stats and a delete action.

---

## 1. Extend `StatementDoc` with `uploadStats`

In [types/index.ts](types/index.ts), add an `UploadStats` interface and an optional `uploadStats` field on `StatementDoc`:

```typescript
export interface UploadStats {
  rowsParsed: number;
  rowsSaved: number;
  categorization: Partial<Record<CategorizationMethod, number>>;
  uncategorized: number; // "Other" debits at save time
}

export interface StatementDoc {
  // ...existing fields...
  uploadStats?: UploadStats;
}
```

The field is optional so existing documents (before this feature) remain valid.

---

## 2. Compute stats in `confirmAndSave`

In [lib/services/extraction-pipeline.ts](lib/services/extraction-pipeline.ts), after building `txDocs` and before calling `insertStatement`, compute the breakdown:

- `rowsParsed` = `args.transactions.length` (what the parser gave us)
- `rowsSaved` = `txDocs.length` (after filtering invalid dates)
- Loop `txDocs` to count by `categorizedBy` and count remaining "Other" debits

Pass the computed `uploadStats` into `insertStatement`.

Update [lib/models/statements.ts](lib/models/statements.ts) `InsertStatementInput` to accept the optional `uploadStats` field and persist it.

---

## 3. Delete API -- `DELETE /api/statements/[id]`

New route at `app/api/statements/[id]/route.ts`:

- Auth check via `getSession()`
- Validate `id` is a valid ObjectId
- Verify the statement belongs to this user (`getStatementById`)
- Delete transactions: call existing `deleteTransactionsForStatement` from [lib/models/transactions.ts](lib/models/transactions.ts) (already implemented, line 193)
- Delete statement: new `deleteStatement` function in [lib/models/statements.ts](lib/models/statements.ts)
- Return `{ ok: true, deletedTransactions: N }`

---

## 4. New "Uploads" page -- `app/(dashboard)/uploads/page.tsx`

A server component page showing a table of all past uploads with:

- **Columns**: Upload date, filename, card type, format, transaction count, total amount, categorization breakdown (visual badges/chips showing rule/source_map/ai/user/uncategorized counts)
- **Delete button** per row with a confirmation dialog ("Delete upload X? This will remove N transactions. Category overrides will be kept.")
- Uses existing `GET /api/statements` for data, adds a client-side delete action calling `DELETE /api/statements/[id]`

The delete confirmation dialog will use the existing `dialog` shadcn component already in the project.

---

## 5. Add "Uploads" to sidebar navigation

In [components/app-sidebar.tsx](components/app-sidebar.tsx), add to the `NAV` array:

```typescript
{ href: "/uploads", label: "Uploads", icon: History },
```

Placed between "Upload" and "Transactions" for logical flow: Upload -> Uploads (history) -> Transactions.

---

## File Change Summary


| File                                  | Change                                                               |
| ------------------------------------- | -------------------------------------------------------------------- |
| `types/index.ts`                      | Add `UploadStats` interface, optional field on `StatementDoc`        |
| `lib/models/statements.ts`            | Add `uploadStats` to `InsertStatementInput`, add `deleteStatement()` |
| `lib/services/extraction-pipeline.ts` | Compute `uploadStats` in `confirmAndSave`, pass to `insertStatement` |
| `app/api/statements/[id]/route.ts`    | **New** -- `DELETE` handler for bulk-delete-by-upload                |
| `app/(dashboard)/uploads/page.tsx`    | **New** -- Upload history page with stats table and delete           |
| `components/app-sidebar.tsx`          | Add "Uploads" nav item                                               |


