# Plan 4 — Supabase Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the public Supabase key env var from the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT) to the new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_*`) format Supabase now ships in its onboarding prompt, and tighten `docs/deploy.md` so the production wiring runbook leaves no dashboard step undocumented (Auth → URL Configuration in particular).

**Architecture:** Two independent phases, each one PR.

- **Phase 1** — env var rename across 3 production files + 1 integration-test helper + `.env.local.example`. Pure refactor: no behavior change. Existing test suite (unit + integration + E2E) is the verification.
- **Phase 2** — `docs/deploy.md` rewrite to (a) reference the publishable-key env var, (b) promote Auth → URL Configuration (Site URL + redirect URLs) to a numbered step instead of a Troubleshooting footnote, (c) note that `SUPABASE_SERVICE_ROLE_KEY` is local-tests-only and must not be set in Vercel. Also fix the stale "Plan 3 pending" line in `CLAUDE.md`.

**Tech Stack:** No new dependencies. Touches Next.js 16 App Router (`src/proxy.ts`, `src/lib/db/{server,client}.ts`), Supabase JS SDK (`@supabase/ssr`), Vitest integration helpers (`tests/integration/_helpers.ts`), and docs.

**Spec:** None — this plan is its own design contract. Scope is the four bullets above.

**Coding rules (from `CLAUDE.md`):**
- Italian-only UI strings live in `src/lib/copy.ts`. Never inline. (No UI strings change in this plan.)
- All mutations through Server Actions; all reads through Server Components or `src/server/queries/`.
- Commit as `brunoteo <brunoteo@hotmail.it>` (the local `.git/config` already pins this — don't override).
- Run `pnpm typecheck && pnpm lint && pnpm test` before claiming any task complete.
- After Phase 1 ends, also run `pnpm test:e2e` (start `pnpm db:start` first if needed).
- This PR introduces a renamed env var → CLAUDE.md MUST be updated in the same commit (per the `CLAUDE.md` Maintenance rule).

**Why a publishable-key migration at all?**
Supabase deprecated the legacy `anon` JWT in late 2025 in favor of the `sb_publishable_*` format. Both still work in the dashboard, but the onboarding prompt and the freshly-generated keys for new projects only return the publishable form. Renaming now means the production project we're about to provision matches the variable name in code, no copy/paste mismatch on first deploy.

**Why `SERVICE_ROLE_KEY` stays where it is.**
Audited 2026-04-30: only `tests/integration/_helpers.ts` reads it (to bypass RLS for test-user creation). Zero production-code references. It already correctly does not appear in `src/`, `src/proxy.ts`, or any Server Action. The deploy runbook says "leave it out" for Vercel — we're keeping that, but making it more explicit.

---

## Phase map

| Phase | PR title (suggested)                                       | Touches                                                                                          |
|-------|------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| 1     | `refactor(env): rename anon key → publishable key`         | `src/lib/db/server.ts`, `src/lib/db/client.ts`, `src/proxy.ts`, `tests/integration/_helpers.ts`, `.env.local.example`, `CLAUDE.md` |
| 2     | `docs(deploy): tighten production runbook`                 | `docs/deploy.md`, `CLAUDE.md`                                                                    |

---

# Phase 1 — Env var rename

**Outcome:** Every code path that reads the public Supabase key reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is no longer referenced anywhere in the repo. All tests still pass.

## Task 1.1: Confirm baseline test suite is green

**Files:** none — verification step.

- [ ] **Step 1: Start local Supabase**

Run: `pnpm db:start`
Expected: studio available at `http://127.0.0.1:54333`, API at `http://127.0.0.1:54331`.

- [ ] **Step 2: Run the full unit + integration suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: typecheck clean, lint clean, all Vitest unit + integration tests pass. If anything fails *before* the rename, stop and fix that first — the rename must not be the thing that broke it.

- [ ] **Step 3: Run E2E**

Run: `pnpm test:e2e`
Expected: all Playwright specs pass (login flow, signup-disabled flow, focus-visible specs, reduced-motion specs).

No commit — this is just to establish a green baseline.

---

## Task 1.2: Rename in `.env.local.example`

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Rewrite the file**

Replace the contents of `.env.local.example` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-local-publishable-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-local-service-role-key
```

(Keep the trailing newline. The third line is the local-tests-only var; it stays.)

- [ ] **Step 2: Update your own `.env.local`**

`.env.local` is gitignored — edit it manually. Rename the existing key in place:

Before:
```dotenv
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```
After:
```dotenv
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

The *value* stays the same — local Supabase still emits the legacy JWT and that JWT is still accepted by `@supabase/ssr` regardless of the env-var name. We're only renaming the variable. Do not regenerate the value.

(Sanity check: `pnpm exec supabase status` will print "anon key: eyJ..." — that's the value.)

- [ ] **Step 3: No commit yet**

Wait until Task 1.6 to bundle the rename into one commit.

---

## Task 1.3: Rename in `src/lib/db/server.ts`

**Files:**
- Modify: `src/lib/db/server.ts:9`

- [ ] **Step 1: Edit**

Replace:
```ts
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
```
with:
```ts
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
```

The full updated function body (for reference):

```ts
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

---

## Task 1.4: Rename in `src/lib/db/client.ts`

**Files:**
- Modify: `src/lib/db/client.ts:8`

- [ ] **Step 1: Edit**

The full updated file:

```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function getBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

---

## Task 1.5: Rename in `src/proxy.ts` and `tests/integration/_helpers.ts`

**Files:**
- Modify: `src/proxy.ts:19`
- Modify: `tests/integration/_helpers.ts:4`

- [ ] **Step 1: Edit `src/proxy.ts`**

Replace:
```ts
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
```
with:
```ts
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
```

The surrounding `createServerClient(...)` call is otherwise untouched.

- [ ] **Step 2: Edit `tests/integration/_helpers.ts`**

Replace:
```ts
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```
with:
```ts
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
```

The local constant name `ANON` stays — it's a local symbol describing "the non-admin client", which is still accurate. Renaming it would just enlarge the diff.

- [ ] **Step 3: Confirm zero references remain**

Run: `grep -rn "SUPABASE_ANON_KEY" src/ tests/ scripts/ .env.local.example 2>/dev/null`
Expected: **no output** (empty result, exit code 1).

If `grep` returns any line, there's still a reference — fix it before continuing.

- [ ] **Step 4: Run the full suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. If integration tests fail with `Invalid API key` or similar, your local `.env.local` was not renamed in Task 1.2 step 2 — fix it now.

- [ ] **Step 5: Run E2E**

Run: `pnpm test:e2e`
Expected: all green.

---

## Task 1.6: Update `CLAUDE.md` and commit

**Files:**
- Modify: `CLAUDE.md` (the "What NOT to do" / Maintenance rule sections — search for `SUPABASE_ANON_KEY` and replace, plus fix the stale "Plan 3 pending" line in the header)

- [ ] **Step 1: Locate references in CLAUDE.md**

Run: `grep -n "SUPABASE_ANON_KEY\|Plan 3 (PWA" CLAUDE.md`
Note any matches. There may be zero hits on `SUPABASE_ANON_KEY` (the file references the env var by category, not name — verify before assuming an edit is needed).

- [ ] **Step 2: Fix the stale Plan 3 status**

In `CLAUDE.md`, near the top:

Before:
```markdown
**Status:** MVP shipped (Plan 1). Plan 2 (Wallet CSV import) shipped. Plan 3 (PWA + production hardening) pending.
```
After:
```markdown
**Status:** MVP shipped (Plan 1). Plan 2 (Wallet CSV import) shipped. Plan 3 (PWA + production hardening) shipped. Plan 4 (Supabase production hardening) in progress.
```

- [ ] **Step 3: If `SUPABASE_ANON_KEY` appeared in step 1 output, rename in place**

Apply the same `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` substitution to any matching prose in `CLAUDE.md`. If no matches, skip.

- [ ] **Step 4: Stage and commit**

```bash
git add src/lib/db/server.ts src/lib/db/client.ts src/proxy.ts tests/integration/_helpers.ts .env.local.example CLAUDE.md
git status     # sanity check: only those files staged, nothing else
git commit -m "refactor(env): rename anon key → publishable key

Migrates NEXT_PUBLIC_SUPABASE_ANON_KEY → NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
across server, browser, and middleware Supabase clients plus the integration
test helper and the env example. The value Supabase emits is unchanged; only
the variable name is updated to match the format Supabase now provisions for
new projects.

Also fixes the stale 'Plan 3 pending' line in CLAUDE.md."
```

- [ ] **Step 5: Final smoke test**

Run: `pnpm dev`
Open `http://localhost:3000/login` in a browser at the mobile viewport (375 × 667). Log in with a local test account. Confirm dashboard loads with KPI cards. Sign out. Sign in again. Stop the dev server.

If anything misbehaves, the rename is the suspect — `grep` again and check `.env.local`.

---

# Phase 2 — Production runbook tightening

**Outcome:** `docs/deploy.md` is the single source of truth for taking the app live, with no missing dashboard steps. Specifically:
1. Step 3 (Vercel env vars) uses the publishable-key name.
2. Step 1 (Supabase project setup) gets a new sub-step for **Auth → URL Configuration** (Site URL + redirect URL list) — it currently only appears in §Troubleshooting.
3. The "do not set in Vercel" rule for `SUPABASE_SERVICE_ROLE_KEY` becomes a callout, not a parenthetical.

No code changes in this phase.

## Task 2.1: Add Auth → URL Configuration step in `docs/deploy.md`

**Files:**
- Modify: `docs/deploy.md` §1

- [ ] **Step 1: Add a new sub-step under §1**

After the existing §1 step 3 (the `Project Settings → Auth → Email` block), insert:

````markdown
4. Open **Project Settings → Auth → URL Configuration** and set:
   - **Site URL:** the Vercel production URL (e.g. `https://budget.vercel.app`). Set this *after* the first Vercel deploy in §3 — come back here to fill it in.
   - **Additional Redirect URLs:** one entry per line:
     - `http://localhost:3000/**` (local dev)
     - `https://*-brunoteo.vercel.app/**` (Vercel preview deploys — replace `brunoteo` with your Vercel team slug)
     - the production URL again as `https://budget.vercel.app/**` if your team slug differs
   - These are the only URLs Supabase will accept as redirect targets after a magic-link / password-recovery click. Wrong list = recovery emails dead-end on a Supabase error page.
````

(Renumber any subsequent §1 sub-steps — there shouldn't be any, since the existing §1 ends after the Email block, but verify.)

- [ ] **Step 2: Cross-link the existing Troubleshooting line**

Locate this line in §Troubleshooting:
```markdown
- **Auth callback fails on production:** confirm the production URL is allowed in **Project Settings → Auth → URL Configuration**.
```

Append a back-reference:
```markdown
- **Auth callback fails on production:** confirm the production URL is allowed in **Project Settings → Auth → URL Configuration** (set up in §1 step 4).
```

- [ ] **Step 3: No commit yet — bundle with Tasks 2.2 and 2.3**

---

## Task 2.2: Use the publishable-key name in §3

**Files:**
- Modify: `docs/deploy.md` §3 step 3

- [ ] **Step 1: Update the Vercel env-var list**

Locate this line:
```markdown
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key.
```

Replace with:
```markdown
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the **publishable key** from Project Settings → API → API Keys (the `sb_publishable_*` value, not the legacy JWT).
```

- [ ] **Step 2: Promote the service-role rule**

Locate this line:
```markdown
   - `SUPABASE_SERVICE_ROLE_KEY` is **not needed at runtime** — leave it out.
```

Replace with a Markdown blockquote so it's harder to miss:
```markdown
> **Do NOT set `SUPABASE_SERVICE_ROLE_KEY` in Vercel.** It is local-tests-only (used by `tests/integration/_helpers.ts` to bypass RLS during test setup). Production code does not read it. Adding it to Vercel widens the attack surface for no benefit.
```

- [ ] **Step 3: No commit yet**

---

## Task 2.3: Sweep the rest of `docs/deploy.md` for stale anon-key prose

**Files:**
- Modify: `docs/deploy.md` (any remaining mentions)

- [ ] **Step 1: Search**

Run: `grep -n "anon\|ANON" docs/deploy.md`

- [ ] **Step 2: Update each match**

Expected matches and their fixes:

§1 step 2 currently reads:
```markdown
   - **anon public key** (used by the app at runtime).
```
Update to:
```markdown
   - **Publishable key** (used by the app at runtime — appears under API Keys as `sb_publishable_*`).
```

§Day-2 operations currently reads:
```markdown
- **Rotating the anon key:** Supabase rotates server-side; update the Vercel env var and redeploy.
```
Update to:
```markdown
- **Rotating the publishable key:** Supabase rotates server-side; update `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy. The same rotation flow applies to the legacy anon JWT if a Supabase migration ever forces a return to it.
```

If `grep` finds other matches, decide each one in context — most should be straightforward word substitutions.

- [ ] **Step 3: Run a sanity render**

Most editors preview Markdown inline; otherwise open `docs/deploy.md` in the GitHub web UI after pushing. The numbering must read 1 → 2 → 3 → 4 cleanly with no gaps in §1.

- [ ] **Step 4: Stage and commit**

```bash
git add docs/deploy.md
git status   # sanity: only docs/deploy.md staged
git commit -m "docs(deploy): tighten Supabase production runbook

- Promotes Auth → URL Configuration (Site URL + redirect URLs) from a
  Troubleshooting footnote to an explicit §1 sub-step.
- Renames anon key references to publishable key, matching the post-rename
  env var in src/.
- Calls out that SUPABASE_SERVICE_ROLE_KEY must NOT be set in Vercel
  (local tests only)."
```

---

## Task 2.4: Mark Plan 4 shipped in `docs/ROADMAP.md`

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add Plan 4 to the table**

In the plans table at the top, add a new row after Plan 3:

```markdown
| 4 | ✅ Shipped | Supabase production hardening (publishable-key rename + deploy runbook) | [`2026-04-30-supabase-prod-hardening.md`](superpowers/plans/2026-04-30-supabase-prod-hardening.md) |
```

- [ ] **Step 2: Add a Plan 4 section at the bottom of the file**

After the existing "## Plan 3 — PWA + production hardening (original scope notes)" section, before "## Out of scope across all plans", insert:

```markdown
---

## Plan 4 — Supabase production hardening (shipped 2026-04-30)

**Goal:** Cut over the public Supabase env var from the legacy anon-JWT name to the new `sb_publishable_*` name Supabase ships in fresh projects, and tighten `docs/deploy.md` so the production wiring runbook leaves no dashboard step undocumented.

**Delivered:**
- Phase 1: `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` across server, browser, and middleware Supabase clients plus the integration-test helper and `.env.local.example`. No behavior change; the JWT value Supabase emits is unchanged.
- Phase 2: `docs/deploy.md` Auth → URL Configuration promoted to a numbered step; publishable-key naming through the runbook; explicit "do NOT set service-role key in Vercel" callout.

No new tables, no new server actions, no UI change. All existing tests still pass unchanged.
```

- [ ] **Step 3: Final commit**

```bash
git add docs/ROADMAP.md CLAUDE.md
git commit -m "docs(roadmap): mark Plan 4 shipped"
```

(`CLAUDE.md` only re-stages if you choose to flip "in progress" → "shipped" at the same time — see Step 4.)

- [ ] **Step 4: (Optional) Flip CLAUDE.md to shipped**

If both phases are merged, update CLAUDE.md status line one more time:

Before:
```markdown
**Status:** MVP shipped (Plan 1). Plan 2 (Wallet CSV import) shipped. Plan 3 (PWA + production hardening) shipped. Plan 4 (Supabase production hardening) in progress.
```
After:
```markdown
**Status:** MVP shipped (Plan 1). Plan 2 (Wallet CSV import) shipped. Plan 3 (PWA + production hardening) shipped. Plan 4 (Supabase production hardening) shipped.
```

Stage and commit alongside the ROADMAP update if you didn't already.

---

# Out of scope (deliberately deferred)

These were considered while drafting and rejected for this plan:

- **Migrating off the legacy JWT value to a freshly-issued publishable JWT.** The variable rename is the goal; the JWT itself doesn't have to change. Supabase will eventually deprecate the legacy format — at that point a one-line dashboard rotation plus a Vercel env-var update is the whole migration. Doing it now is premature.
- **Setting up SMTP / customizing Auth email templates.** Email confirmation is OFF in this app (single-couple use case, see Plan 3 spec §2). The only outbound email Supabase sends is password recovery, manually triggered from the Studio. The default Supabase sender is good enough for two recovery emails a year.
- **Backups / PITR upgrade.** Free-tier 1-day PITR is documented in `docs/deploy.md` §8. Upgrading is a billing decision, not an engineering one.
- **Rate-limiting Server Actions.** Already explicitly out-of-scope in the Plan 3 spec; nothing has changed.
- **Production smoke-test automation.** Manual smoke test in `docs/deploy.md` §4 is the bar for a 2-user app.

---

# Self-review (writing-plans skill)

**Spec coverage** — the four bullets in Architecture map to:
- Env var rename across `src/` → Tasks 1.3, 1.4, 1.5.
- Env var rename in test helper → Task 1.5 step 2.
- `.env.local.example` rename → Task 1.2.
- `CLAUDE.md` env-var doc + stale Plan 3 line → Task 1.6.
- `docs/deploy.md` publishable-key references → Task 2.2, 2.3.
- `docs/deploy.md` Auth URL Configuration as numbered step → Task 2.1.
- `docs/deploy.md` service-role-key callout → Task 2.2 step 2.
- `docs/ROADMAP.md` Plan 4 entry → Task 2.4.

**Placeholder scan** — no `TODO`, no "implement later", no "similar to". Every `Edit` shows the exact `Before` / `After` text or full file body. The two grep checks (Task 1.5 step 3, Task 2.3 step 1) have explicit expected output.

**Type consistency** — only one symbol crosses tasks (`process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), and it appears identically in Tasks 1.2, 1.3, 1.4, 1.5, 2.2.

**Risk** — Phase 1 is the only failure-prone piece. Failure modes:
1. Forgot to rename `.env.local` (Task 1.2 step 2). Symptom: `Invalid API key` 401s in integration tests. Fix: rename, re-run.
2. A grep miss leaves a `SUPABASE_ANON_KEY` reference in some non-obvious file. Symptom: production deploy reads `undefined` for that path's key, all auth fails. Mitigation: Task 1.5 step 3's `grep` covers `src/`, `tests/`, `scripts/`, and the env example — that is everywhere it could plausibly live.
