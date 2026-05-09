---
name: audit-plan
description: Audit a recently executed plan from .cursor/plans/ against the actual code in the repo, verifying both (a) plan fidelity — every step was implemented as specified — and (b) compliance with DEVELOPER_GUIDE.md conventions, then fix the issues it finds. Use when the user asks to audit/review/verify a plan, check if a plan was implemented correctly, or do a post-implementation review against the developer guide.
---

# Audit Plan Implementation

You are performing a **post-implementation audit** that compares a planning document against the actual code that was written, grades the result against the project's `DEVELOPER_GUIDE.md`, and then **fixes the issues it finds**.

The flow is: audit → present report → apply fixes → present diff summary. Do not stop after the report.

---

## Step 1 — Locate the plan

1. List `.cursor/plans/` in the project root.
2. If the user named a specific plan, use it. Otherwise pick the **most recently modified** `*.plan.md` file.
3. If no plan exists, stop and tell the user.
4. Read the entire plan file. Extract:
   - **Goal / scope** (what the plan set out to do)
   - **File-level changes** (every file the plan said it would create or modify)
   - **Behavior / acceptance criteria** (what the working result should do)
   - **Explicit non-goals** (things the plan said it would NOT do)

Record these as your audit checklist. Every item gets a verdict in Step 4.

---

## Step 2 — Identify what was actually changed

Use git to determine the implementation surface:

```bash
git log --oneline -20
git diff --stat HEAD~N..HEAD   # N = commits since plan started, infer from log
git status
```

If the plan was implemented across multiple commits, use `git log --since=<plan-date>` or ask the user which commit range corresponds to the plan. If the work is uncommitted, use `git diff` and `git status` to enumerate dirty files.

Build a list of **files actually touched**. You will compare this to the plan's expected file list in Step 4.

---

## Step 3 — Read the developer guide

Read `DEVELOPER_GUIDE.md` in full. Treat every numbered section as an audit dimension. Pay particular attention to:

- §2 Project structure (file placement, route group conventions)
- §3 Structure & components (one responsibility per file, no ShadCN modifications)
- §4 DRY (helper duplication across API routes)
- §5–6 File size / split criteria
- §8 Naming conventions
- §9 TypeScript & type safety (no `any`, no `as` on parsed JSON, explicit return types)
- §10 Imports (use `@/`, `import type`, no deep relative paths)
- §11 Next.js 16 conventions (`proxy.ts` not `middleware.ts`, server-component default)
- §12 Database conventions (singleton client, model layer not raw queries in routes)
- §13 API route conventions (try/catch, `catch (err)`, `console.error`, `{ error: string }` shape, auth-first, no business logic)
- §14 Error handling (client-side `toast.error` on every fetch failure)
- §15–16 UI/styling (ShadCN, Lucide only, no emoji, `cn()` for conditional classes)
- §17 Constants (no magic numbers duplicated between client and server)
- §18 Services & business logic (extraction pipeline ordering, pure parsers)
- §19 Exports (named exports, `export default` only for Next.js framework files)
- §21 Client-side data fetching (loading/error/empty states, URL-driven filters)

These are the rules you grade against. If the developer guide has been updated since you last read it, re-read it — do not rely on memory.

---

## Step 4 — Read the changed files and audit

For every file in the implementation surface (Step 2):

1. **Read the full file** with the Read tool. Do not skim — type-safety violations and silent error swallowing are easy to miss in excerpts.
2. Check it against the plan's expectations (was the right thing built in the right place?).
3. Check it against every applicable section of the developer guide.

For files the plan said would be created/modified but git shows untouched: that is a **plan-fidelity miss** — record it.

For files that were touched but the plan did not mention: that is **scope drift** — record it (may be benign, may not).

Use the Explore agent if the change set is large (>10 files) and you need parallel reading. Use Bash + grep for targeted checks (e.g. find every `catch {` without a variable, find `as ` casts on `JSON.parse`, find emoji in JSX, find `middleware.ts`, find magic numbers like `20 * 1024 * 1024` appearing in more than one file).

Useful targeted greps:

```bash
# Anonymous catch blocks
grep -rn "catch {" app lib components --include="*.ts" --include="*.tsx"

# `as` casts on parsed JSON
grep -rn "JSON.parse.*as " app lib --include="*.ts" --include="*.tsx"

# Deprecated middleware.ts
ls middleware.ts 2>/dev/null && echo "VIOLATION: middleware.ts exists; should be proxy.ts"

# Deep relative imports
grep -rn "from \"\\.\\./\\.\\./" app lib components --include="*.ts" --include="*.tsx"

# Emoji in source (rough heuristic — check matches by hand)
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" app components --include="*.tsx"

# Template-literal class composition (likely §16 violation)
grep -rn "className={\`" app components --include="*.tsx"

# Error response shape drift
grep -rn "authenticated: false\|success: false\|message:" app/api --include="*.ts"
```

These are starting points — adapt to whatever the plan actually changed.

---

## Step 5 — Produce the audit report

Output a single structured report in this exact shape. Be terse — one line per finding. Use markdown link syntax `[file.ts:42](file.ts#L42)` for every code reference so the user can click through.

```markdown
# Plan Audit: <plan filename>

**Plan goal:** <one sentence>
**Implementation surface:** <N files touched across M commits>

## 1. Plan fidelity

| Plan item | Status | Evidence |
|-----------|--------|----------|
| <item from plan> | ✅ done / ⚠️ partial / ❌ missing / ➕ extra | [file.ts:line](...) or "not found" |

## 2. Developer guide compliance

Group findings by guide section. Only list sections with findings — skip clean ones.

### §<N> <Section name>
- ❌ **<rule violated>** — [file.ts:line](file.ts#L<line>) — one-line description of the violation
- ⚠️ **<rule at risk>** — [file.ts:line](file.ts#L<line>) — borderline, explain why

## 3. Scope drift

Files touched outside the plan, or plan items deferred:
- <file or item> — <one line on whether this is a problem>

## 4. Verdict

One paragraph (3–5 sentences):
- Did the implementation deliver the plan's goal?
- Top 3 issues by severity (link to the findings above).
- What the user should fix before considering the plan complete.
```

---

## Severity rubric

- **❌ blocking** — broken contracts: silent fetch failures, anonymous catches in API routes, `as` casts on parsed JSON, missing auth check, business logic in route handlers, emoji in UI, `middleware.ts` instead of `proxy.ts`.
- **⚠️ warning** — style/maintainability: file >300 LOC without justification, magic numbers duplicated, template-literal class composition, missing explicit return types on aggregations.
- **ℹ️ note** — observations worth surfacing but not necessarily wrong: scope drift that looks intentional, helper that may want extraction once a 2nd consumer appears.

Be honest. Don't pad the report with green checkmarks for things you didn't actually verify. If you ran out of time on a section, say so explicitly — "did not audit X" is better than a false ✅.

---

## Step 6 — Fix the issues

After presenting the report, **apply fixes**. Do not wait for further user prompting unless the change is risky (see "When to pause" below).

### Fix order

Work top-down by severity, then by file (to minimize churn):

1. **All ❌ blocking findings** — these are non-negotiable. Fix every one.
2. **All ⚠️ warnings** — fix unless the rationale for skipping is strong (e.g. file just over 300 LOC where splitting would worsen cohesion per §5–6). If you skip, say so in the diff summary with one-line reasoning.
3. **Plan-fidelity ❌ misses** — if the plan said "create X" and X was never created, create it now. If a plan item is genuinely no longer needed, do not silently skip — call it out and ask.
4. **ℹ️ notes** — do NOT fix automatically. Leave them as observations.

### Fix discipline

- **Use the Edit tool**, not Write, for changes to existing files. Read before editing.
- **One concern per edit** — don't bundle a try/catch fix with a magic-number extraction in the same Edit call. Smaller, named changes are easier for the user to review.
- **Re-run targeted greps after fixing** to confirm the violation class is actually gone (e.g. after fixing anonymous catches, re-grep for `catch {` and confirm zero hits in the audit surface).
- **Update the structure diagram in `DEVELOPER_GUIDE.md` §2** if you create a new file under a route, service, or utility module — §2 says the diagram must stay current.
- **Update `.env.example`** if you fix a missing env-var reference (§17).
- **Do not run `npm install` / change dependencies** unless a finding requires it. If it does, ask first.
- **Do not commit, push, or open PRs.** The user runs git commands themselves unless they explicitly delegate.

### When to pause and ask

Stop and ask the user before proceeding when any of these apply:

- A fix would **change public API surface** (route response shape, exported function signatures used by other modules).
- A fix would **delete >50 lines** of existing code or a whole file.
- The plan-fidelity gap is large (an entire planned feature is missing) — confirm whether to build it now or treat as deferred.
- Two valid fix paths exist with different tradeoffs (e.g. extract helper to `lib/range.ts` vs. co-locate) and the guide does not pick one — present the options.
- The fix requires running migrations, seeding data, or touching `.env.local`.

### Step 7 — Verify

After fixes are applied:

1. Re-run the targeted greps from Step 4. Report any remaining hits.
2. Run `npx tsc --noEmit` (or the project's typecheck script if defined in `package.json`) to confirm no type regressions.
3. Run `npm run lint` if the project has a lint script. Fix lint errors introduced by your changes; do not fix pre-existing lint debt unless the user asked.

### Step 8 — Final summary

Append to the report:

```markdown
## 5. Fixes applied

| Finding | File | Change |
|---------|------|--------|
| ❌ <rule> | [file.ts:line](file.ts#L<line>) | One-line description |

## 6. Skipped / deferred

- <finding> — <one-line reason>

## 7. Verification

- ✅ targeted greps clean / ❌ remaining: <list>
- ✅ `tsc --noEmit` passes / ❌ <error count>
- ✅ `npm run lint` passes / ❌ <error count>
```

End with one sentence on what (if anything) the user should do next — typically "review the diff and commit when satisfied."

---

## What NOT to do

- Do not re-summarize the plan back at the user — they wrote it. Reference items by name only.
- Do not flag things the developer guide explicitly allows (e.g. ShadCN files >300 LOC, `export default` on Next.js page/layout/loading/error files).
- Do not modify files in `components/ui/` (ShadCN-generated). If a finding lives there, surface it as ℹ️ with a note that the file is generated.
- Do not invent rules that aren't in the guide. If something feels wrong but isn't covered, list it under "ℹ️ note" with your reasoning, not as a violation.
- Do not commit, push, or amend git history. Fixes go in the working tree only.
- Do not "fix" by silencing — adding `// eslint-disable`, casting to `any`, or wrapping in a try/catch that swallows the real error is worse than the original violation.
