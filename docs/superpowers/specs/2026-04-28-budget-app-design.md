# Budget App — Design Spec

**Date:** 2026-04-28
**Status:** Draft, awaiting user review

## 1. Purpose

A two-user web application for a couple to plan and track their personal monthly budget. Replaces a manual Google Sheet workflow. Each spouse has an independent account with isolated data; no shared/joint view in v1.

The app's distinguishing feature is that "month" is configurable per user: budget cycles align to each user's paycheck day (e.g., 27th-to-26th, 10th-to-9th) rather than calendar months.

## 2. Users and Goals

- **Primary users:** Two adults (a married couple) using one shared deployment.
- **Goal:** Plan an expected budget per category at the start of each pay cycle, track actual expenses against it during the cycle, and see at-a-glance how the cycle is going relative to budget and salary.
- **Non-goals (v1):** Bank import, OCR receipts, multi-currency, savings-goal tracker, joint household view, shared budget, multi-language UI.

## 3. Core Concepts

### 3.1 Cycle (the "month")
A cycle is a date range that represents one budget period for one user. Each user has a `cycle_start_day` (1–31). The current cycle for a user starts on the most recent occurrence of `cycle_start_day` and ends the day before the next occurrence.

- Example: `cycle_start_day = 27`, today = 2026-04-28 → current cycle is `2026-04-27 → 2026-05-26`.
- Cycles are generated lazily: a `cycles` row is created on demand the first time it is referenced — either when the user opens that cycle in the UI, or when an expense is created with an `occurred_on` date that falls in a not-yet-existing cycle. Salary defaults from `profiles.default_salary` at creation time and can be edited afterward.
- Edge cases:
  - Months with fewer days than `cycle_start_day` (e.g., 31 in February): clamp to the last day of that month for cycle boundaries. So a `cycle_start_day = 31` cycle in February starts Feb 28 (or Feb 29 in leap years).
  - Display label: `"<MonthName> <Day> – <MonthName> <Day>"`, plus a short label like `"Apr-May 2026"`.

### 3.2 Category
A line in a cycle representing a spending bucket (e.g., "Spese casa", "Mutuo"). Each category has:
- `name` (free text)
- `expected_amount` (EUR, the budget)
- `is_fixed` (boolean — true for recurring fixed expenses like Mutuo, Leasing; used for carry-forward defaults)
- `sort_order` (integer for manual ordering)

Notes are stored per-expense, not per-category. To see annotations on a category (e.g., what "Regali" was spent on), the user taps/clicks the category row to expand the per-transaction list with each transaction's note.

Categories belong to a cycle. They are NOT shared across cycles, but a "carry forward from last cycle" action copies the previous cycle's categories (name, expected_amount, is_fixed, sort_order) into the new one. If no previous cycle exists for the user, the action is unavailable (button hidden) and the user creates categories from scratch.

### 3.3 Expense
A single transaction within a cycle:
- `amount` (EUR, positive)
- `category_id`
- `occurred_on` (date — used to determine which cycle it belongs to)
- `note` (free text, optional)

When an expense is created, its `cycle_id` is derived from `occurred_on` plus the user's current `cycle_start_day`, and the corresponding cycle row is created on demand if it does not already exist. Editing an expense's `occurred_on` to a date in a different cycle re-derives `cycle_id` and reassigns the expense (creating the destination cycle if needed). Editing `category_id` requires the new category to belong to the same cycle as the expense.

### 3.4 Salary and Extra Income
Each cycle records:
- `salary` (EUR) — base salary for this cycle. Defaults from the user's profile `default_salary`. Can be overridden per cycle.
- `extra_income` (array of `{ label, amount }`) — for Italian context: tredicesima, quattordicesima, bonuses. Tagged so KPI logic can isolate "% of base salary spent" from "% of total income spent".

### 3.5 Transaction Import

Users can bulk-import transactions from external apps (primary target: **Wallet by BudgetBakers**, but the design accommodates any CSV by allowing column mapping). The import flow is review-first: parsed rows land in a staging table in the UI, the user assigns categories (with smart suggestions), then commits — the app never creates expenses without an explicit confirm step.

**Format support (v1):** CSV only. XLS and PDF are out of scope for v1 (XLS may be added in v2 once the CSV path is stable; PDF requires layout-aware extraction and is unlikely to add value over CSV).

#### Wallet (BudgetBakers) export format — confirmed from sample

Verified against `report_2026-04-28_155541.csv`:
- **Delimiter:** semicolon (`;`)
- **Decimal:** Italian — comma (e.g., `-83,83`); thousands separator typically absent
- **Encoding:** UTF-8
- **Date:** `YYYY-MM-DD HH:MM:SS` (local time); we use the date portion only
- **Header row** (in order): `account; category; currency; amount; ref_currency_amount; type; payment_type; payment_type_local; note; date; gps_latitude; gps_longitude; gps_accuracy_in_meters; warranty_in_month; transfer; payee; labels; envelope_id; custom_category`
- **Income vs expense:** the `type` column carries the values `Spese` (expense) or `Entrate` (income). This is more reliable than sign and is what the importer keys on; the negative sign on `amount` is then flipped when stored.
- **Wallet's own `category`** (e.g., `Carburante`, `Software, App e Giochi`, `Leasing`) is a strong signal for auto-categorization.

**Default mapping for Wallet** (seeded on signup, keyed on header hash so imports skip the mapping step):
| Source column      | App field                    | Notes |
|--------------------|-------------------------------|-------|
| `date`             | `occurred_on`                 | Take date part of timestamp |
| `amount`           | `amount`                      | Parse `-83,83` → `83.83` (sign-flipped on expenses) |
| `note`             | `note`                        | Stored verbatim; UI may show last `//`-separated segment for legibility |
| `category`         | (matching key for rules)      | Used for `category_rules` matching, not stored on the expense |
| `payee`            | (rule input, optional)        | Concatenated with `category` for rule matching |
| `type`             | (filter)                      | Rows with `type = 'Entrate'` are skipped (income import is out of scope v1) |
| `transfer = 'true'`| (filter)                      | Internal account-to-account transfers are skipped (would double-count) |
| All other columns  | (ignored)                     | account, currency, ref_currency_amount, payment_type, gps_*, warranty, labels, envelope_id, custom_category |

#### Flow

1. **Upload.** User drops a CSV into the import page. File is parsed in the browser using `papaparse` (delimiter auto-detected, with semicolon expected for Wallet; encoding UTF-8 default with fallback to Windows-1252).
2. **Column mapping.** A preview of the first 5 rows is shown. If the file's header hash matches a saved `import_mappings` row for this user, the mapping is applied silently and the user goes straight to staging. Otherwise the user maps source columns to app fields: `date`, `amount`, `description` (required), `wallet_category` (optional). The mapping is saved as a new `import_mappings` row. The Wallet default mapping is pre-seeded for every user on signup.
3. **Filtering.** Rows where `type = 'Entrate'` are filtered out and counted as `entrate ignorate`. Rows where `transfer = 'true'` are filtered as `trasferimenti interni ignorati`. Remaining rows are sign-flipped (negative `amount` → positive expense amount).
4. **Suggested categorization.** For each remaining row, the app picks an app-side category by checking `category_rules` in priority order. The matching string concatenates the row's Wallet `category` and `payee` and the `note` (lowercased). The first matching rule wins. If no rule matches, the row arrives at staging with no category and a yellow "da categorizzare" badge.
5. **Rule learning.** When the user manually picks a category in staging, the UI offers two checkboxes:
   - "Applica anche alle prossime con la stessa categoria Wallet «Carburante»" — saves a rule `pattern = "wallet:carburante"` (priority 100).
   - "Applica anche alle prossime con questo testo" — saves a rule on a normalized substring of the note (priority 50). The user can also add/edit/delete rules later in Settings.
6. **Staging review.** A table shows every parsed row: date, amount, last segment of note, full note (tooltip), suggested category (editable dropdown showing the destination cycle's categories + "Crea nuova…"), include/exclude checkbox. Rows whose `occurred_on` falls in a not-yet-existing cycle show a small note: "creerà ciclo Mar 27 – Apr 26".
7. **Duplicate detection.** Before commit, each row's fingerprint = `sha256(occurred_on || '|' || amount || '|' || lower(note))` is computed and matched against existing `expenses.fingerprint` for the user (across all cycles, since a misdated import could land anywhere) and against other rows in the same batch. Duplicates are unchecked by default with a red "duplicato" badge; user can override.
8. **Commit.** Bulk insert into `expenses`, creating any missing cycles and any missing categories (when a rule references a category name absent from the destination cycle, it is created with `expected_amount = 0`). All inserts share an `import_id` for traceability. The import session is recorded in `imports` for audit / undo.
9. **Undo.** Each `imports` row supports a single-click "Annulla importazione" within 24 hours, deleting only the expenses created by that import (via `expenses.import_id`). After 24 hours undo is unavailable to keep the table clean.

#### Seeding initial rules

On a user's first import, the app offers to seed `category_rules` by matching each app-side category name (from the most recent cycle, or hardcoded defaults if no cycle exists) against Wallet's category vocabulary using simple Italian normalization (lowercase, accents stripped, partial-substring match). Examples that would auto-seed: `Carburante` ↔ `Carburante`, `Leasing` ↔ `Leasing`, `Salute` ↔ `Salute e bellezza`. The user reviews the seed list and confirms before any rule is created.

#### What is explicitly NOT done in v1
- No automatic / scheduled import (no recurring "pull from Wallet").
- No bank API connections.
- No income tracking from imports (income comes only from `cycles.salary` + `extra_income`).
- No multi-account separation — a Wallet user with several accounts gets all expense rows merged into the same app cycle. The Wallet `account` column is ignored.
- No regex rules in v1 — only normalized substring patterns, to keep the rule UI simple.

## 4. Architecture

```
┌──────────┐      ┌──────────────────────────┐      ┌────────────────────┐
│ Browser  │ ───► │  Next.js 15 (Vercel)     │ ───► │ Supabase           │
│ (PWA)    │      │  - App Router            │      │  - Postgres + RLS  │
│          │      │  - Server Components     │      │  - Auth (email)    │
│          │      │  - Server Actions        │      │                    │
└──────────┘      └──────────────────────────┘      └────────────────────┘
```

- **Frontend:** Next.js 15 App Router, React Server Components for data reads, Server Actions for mutations. TypeScript strict mode. Tailwind CSS + shadcn/ui for components. Recharts for visualizations. **`papaparse`** for CSV parsing in the import flow (browser-side parsing keeps file content off the server unless the user commits).
- **Backend:** Supabase Postgres. Auth via Supabase email/password. Row-Level Security (RLS) policies enforce that every row is only readable/writable by its owning user.
- **Hosting:** Vercel (Hobby tier) for the Next.js app; Supabase Free tier for DB + Auth.
- **PWA:** A web manifest + service worker for "Add to Home Screen" on mobile. No offline write queue in v1 — online-only.
- **Mobile-first:** primary target is a smartphone in portrait mode (≤ 420 px wide). Every screen is designed for that viewport first, then progressively enhanced at `sm` (≥ 640 px), `md` (≥ 768 px), and `lg` (≥ 1024 px) breakpoints. Tap targets ≥ 44×44 px. The dashboard category list is rendered as stacked cards on mobile and as a table on `md+`. The "Aggiungi spesa" action surfaces as a thumb-reachable floating action button (FAB) on mobile and as an inline button in the desktop top bar. Forms collapse to single-column with full-width inputs on mobile. The import staging table also collapses to row-cards on mobile (one transaction per card with category dropdown beneath).
- **Localization:** Hardcoded Italian copy. EUR currency formatted as `€ 1.234,56` (Italian locale). Dates formatted as `DD/MM/YYYY`.

### Module boundaries (Next.js)
```
/src
  /app                    — routes (dashboard, expenses, categories, trends, settings, auth)
  /components             — UI components (shadcn-derived + app-specific)
  /lib
    /db                   — Supabase client factories (server/client/admin)
    /cycle                — pure cycle math (start/end date computation, label generation)
    /kpi                  — pure KPI computation (totals, pacing, % salary)
    /format               — IT EUR / date formatters
    /import               — pure CSV parsing, column-mapping inference, dedupe hashing, rule matching
  /server
    /actions              — Server Actions (createExpense, updateCategory, commitImport, …)
    /queries              — typed read queries
  /styles                 — Tailwind config + globals
```

The `cycle` and `kpi` libs are pure functions with no Supabase dependency, fully unit-testable in isolation.

## 5. Data Model (Supabase Postgres)

```sql
-- pgcrypto provides sha256() used for the expenses.fingerprint generated column.
create extension if not exists pgcrypto;

-- users table is managed by Supabase Auth; we add a profile row keyed by auth.uid().
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  cycle_start_day smallint not null check (cycle_start_day between 1 and 31),
  default_salary numeric(12,2),
  created_at timestamptz default now()
);

create table cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  salary numeric(12,2),
  extra_income jsonb not null default '[]'::jsonb,  -- [{label, amount}]
  created_at timestamptz default now(),
  unique (user_id, start_date)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id) on delete cascade,
  name text not null,
  expected_amount numeric(12,2) not null default 0,
  is_fixed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- imports must be defined before expenses because expenses.import_id references it.
create table imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  filename text not null,
  source text not null default 'wallet-budgetbakers', -- free-form tag for analytics
  row_count int not null,                              -- rows in source file
  committed_count int not null,                        -- rows that became expenses
  skipped_count int not null,                          -- rows skipped (income, duplicate, user)
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null,
  note text,
  import_id uuid references imports(id) on delete set null,
  fingerprint text generated always as (
    encode(sha256((occurred_on::text || '|' || amount::text || '|' || coalesce(lower(note), ''))::bytea), 'hex')
  ) stored,
  created_at timestamptz default now()
);

create table import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  header_hash text not null,           -- sha256 of normalized source header row
  mapping jsonb not null,              -- { date: "Date", amount: "Amount", description: "Note", category: "Category" }
  source text,                         -- e.g., "wallet-budgetbakers"
  created_at timestamptz default now(),
  unique (user_id, header_hash)
);

create table category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pattern text not null,               -- normalized substring (lowercased)
  category_name text not null,         -- matched by name within target cycle on apply (cycles have independent category rows)
  priority int not null default 0,     -- higher = checked first
  created_at timestamptz default now()
);

-- RLS: every table restricted to rows where user_id = auth.uid() (directly, or via cycle/import join).
```

Indexes: `cycles(user_id, start_date)`, `categories(cycle_id)`, `expenses(cycle_id, occurred_on)`, `expenses(fingerprint)`, `imports(user_id, created_at desc)`, `category_rules(user_id, priority desc)`.

**Note on `category_rules.category_name`:** since categories live per-cycle, rules store a category *name* (not id). At commit time the importer maps that name to the category row in the destination cycle, creating the category if absent (with `expected_amount = 0`).

## 6. KPI Definitions (pure functions over a cycle)

Given a cycle with categories `C` and expenses `E`, with `today` and the cycle's `start_date`/`end_date`:

- `total_budget = sum(c.expected_amount for c in C)`
- `total_spent = sum(e.amount for e in E)`
- `total_remaining = total_budget - total_spent`
- `percent_consumed = total_spent / total_budget`
- `cycle_progress = (today - start_date) / (end_date + 1 - start_date)`, clamped to `[0, 1]`
- `pace_delta = percent_consumed - cycle_progress` — negative is good (under pace), positive is over pace
- `percent_of_salary_spent = total_spent / salary` (when salary set)
- `percent_of_total_income_spent = total_spent / (salary + sum(extra_income))`
- Per-category: `actual_c`, `delta_c = expected_c - actual_c`, `over_budget = actual_c > expected_c`

KPIs render as: total cards (Budget / Spent / Remaining / % Salary), a pacing bar (cycle progress vs spending progress), and a sortable category table flagging over-budget rows.

## 7. UI Screens

1. **Dashboard (`/`)** — current cycle. Top: KPI cards + pacing bar. Middle: category list — on mobile, stacked cards (one card per category showing name, budget bar, spent / remaining, expand chevron); on `md+`, a table with columns Categoria, Budget Previsto, Spesa Effettiva, Differenza, % su Totale Budget. Tap/click any category row or card to expand its per-transaction list (date, note, amount). No category-level Note column. Cycle picker dropdown in the top bar (mobile: full-width sheet; desktop: inline). Floating "+" action button on mobile for quick expense entry.
2. **Add expense (`/expenses/new`)** — quick form: amount, category dropdown, date (default today), note. Mobile-optimized for PWA. Success → return to dashboard.
3. **Categories editor (`/categories`)** — list-edit current cycle's categories. Buttons: "Aggiungi categoria", "Riporta dal ciclo precedente", reorder, mark fixed, delete (only if no expenses).
4. **Import (`/import`)** — drag-and-drop CSV upload, column-mapping confirm step (skipped if a saved mapping matches the file's header hash), staging table with per-row category dropdown + duplicate flags + "applica anche alle prossime con lo stesso testo" learn-rule checkbox, summary footer ("X transazioni, Y duplicate, Z entrate ignorate"), commit button. After commit: success page with a 24-hour "Annulla importazione" link.
5. **Import history (`/import/history`)** — list past `imports` rows with filename, date, counts, and undo button (within 24h).
6. **Trends (`/trends`)** — last 6 cycles, per-category line chart and overall bar chart. Recharts.
7. **Settings (`/settings`)** — display name, `cycle_start_day`, `default_salary`, **manage category rules** (list, edit, delete keyword→category rules learned during imports). Logout.
8. **Auth (`/login`, `/signup`)** — Supabase email/password. Signup creates a `profiles` row.

Mobile-first responsive design. Italian copy throughout.

## 8. Error Handling

- **Auth errors:** redirect to `/login` with toast.
- **Validation:** Zod schemas on Server Actions. Client-side mirror via `react-hook-form` + `@hookform/resolvers/zod`. Inline field errors.
- **DB errors:** generic toast `"Si è verificato un errore. Riprova."`; full error logged server-side.
- **Cycle math:** invalid `cycle_start_day` is rejected at write time (DB check + Zod). Day clamping for short months is documented and unit-tested.
- **Empty states:** clear Italian copy, e.g., "Nessuna spesa in questo ciclo. Aggiungi la prima."

## 9. Testing Strategy

- **Unit tests (Vitest):**
  - `lib/cycle/*` — cycle date math: standard months, month-shorter-than-day clamping, leap years, edge of cycle boundaries.
  - `lib/kpi/*` — KPI calculations: empty cycle, over-budget, perfect pace, division-by-zero on missing salary.
  - `lib/format/*` — Italian EUR / date formatting.
  - `lib/import/*` — CSV parsing (UTF-8 + Windows-1252), semicolon delimiter, Italian decimal parsing (`-83,83` → `83.83`), `type='Entrate'` filtering, `transfer='true'` filtering, sign-flipping, fingerprint computation, rule matching with priority ordering, header-hash stability across whitespace/casing, Wallet seed-rule generation against a known app-category list.
- **Integration tests (Vitest + Supabase local):**
  - RLS policies: user A cannot read/write user B's rows (extended to `imports`, `import_mappings`, `category_rules`).
  - Server actions: createExpense correctly assigns cycle_id from `occurred_on`.
  - Carry-forward: copies categories with correct fields.
  - Import commit: dedupe against existing expenses, lazy-create cycles, attach `import_id`, undo deletes only the right rows.
- **E2E (Playwright):** (a) signup → set cycle_start_day → create cycle → add categories → add expenses → see KPIs; (b) auth-redirect; (c) import flow: upload the captured `report_2026-04-28_155541.csv` fixture (committed under `tests/fixtures/wallet/`) → header recognized → review staging (income & transfer rows pre-filtered, expenses signs flipped, Wallet categories matched to seeded rules) → commit → verify expenses appear on dashboard with correct cycle assignment → undo → verify rows removed.
- **Manual UI verification:** browser-tested before claiming completion.

## 10. Project Documentation — `CLAUDE.md`

A `CLAUDE.md` file lives at the repository root and is auto-loaded into every Claude Code session that opens this project. Its purpose is to give future AI sessions (and human contributors) the minimum context needed to make correct, on-style changes without re-discovery.

**`CLAUDE.md` is the very first deliverable of the implementation plan — it is created and committed before any application code, before scaffolding the Next.js app, and before any Supabase migration.** This guarantees that every subsequent step in the build (and every future session) operates against a written contract for stack, conventions, and constraints. The file is then updated in the same commit whenever a load-bearing convention changes (new directory, new tooling, new constraint).

### 10.1 Required sections

1. **Project overview** — one paragraph: what the app is, who uses it, the unusual cycle concept (paycheck-day-aligned).
2. **Tech stack** — Next.js 15 (App Router, Server Components, Server Actions), TypeScript strict, Tailwind, shadcn/ui, Supabase (Postgres + Auth + RLS), Recharts, papaparse (CSV parsing for transaction imports), Vitest, Playwright. Hosted on Vercel.
3. **Repository layout** — annotated tree of `/src/app`, `/src/components`, `/src/lib/{cycle,kpi,format,db,import}`, `/src/server/{actions,queries}`, plus `supabase/migrations` and `tests/`.
4. **Commands** — exact npm scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:reset`, `db:migrate`, `db:types` (generate Supabase TypeScript types).
5. **Conventions**
   - **Mobile-first.** Every screen is designed for ≤ 420 px portrait first, then enhanced at `sm`/`md`/`lg`. Tap targets ≥ 44×44 px. Don't ship desktop-only patterns (hover-only menus, mouse-only drag) without a mobile-equivalent.
   - All UI copy is Italian. Currency formatted via `lib/format` (`€ 1.234,56`); dates `DD/MM/YYYY`. Never hardcode formats inline.
   - Pure cycle/KPI math lives in `lib/cycle` and `lib/kpi` and must remain free of Supabase/Next imports — they are unit-tested in isolation.
   - All mutations go through Server Actions in `src/server/actions/*`, validated with Zod. No direct Supabase mutations from client components.
   - All reads pass through `src/server/queries/*` to keep RLS context consistent.
   - Every new table or column must include an RLS policy in the same migration.
   - Components from `shadcn/ui` are added via the CLI and lightly themed in `tailwind.config.ts` — do not fork them by hand.
6. **Data model invariants** — short list:
   - Each user owns their data; cross-user reads/writes are blocked by RLS — never bypass with the service-role key from app code.
   - `expenses.cycle_id` is always derivable from `occurred_on` and the user's `cycle_start_day` at the time of write.
   - Cycles are unique per `(user_id, start_date)` and created lazily.
7. **Testing rules** — TDD where practical; cycle math and KPI logic must have unit tests before being relied on by UI; RLS must have integration tests; new screens get at least a smoke test.
8. **Verification before claiming completion** — for any UI change, start the dev server and exercise the feature in a browser; for any DB change, run migrations against a fresh local Supabase and execute the integration test suite. Type-check + lint must pass.
9. **What NOT to do** — no joint-household features, no multi-currency, no English copy, no client-side Supabase admin keys, no schema changes without a migration file, no committing `.env.local`.
10. **External docs** — when looking up library APIs (Next.js, Supabase, shadcn, Recharts, Zod), use the `context7` MCP server rather than relying on memory.

### 10.2 Maintenance rule

`CLAUDE.md` is part of the change. Any PR that introduces a new directory under `/src/lib`, a new server-action pattern, a new npm script, a renamed environment variable, or a new architectural constraint must update `CLAUDE.md` in the same commit. PR descriptions should explicitly mention if `CLAUDE.md` was updated or why no update was needed.

## 11. Out of Scope (v1)

- Joint household view across users
- Receipt image upload / OCR
- **XLS / PDF import** (only CSV in v1; XLS deferred to v2 once CSV path is stable)
- **Scheduled / automatic transaction sync** (no recurring "pull from Wallet"; user uploads each time)
- **Bank API connections / direct bank import**
- **Income transactions from imports** (income comes only from `cycles.salary` + `extra_income`; positive-amount rows are filtered out and reported)
- Multi-currency
- Savings goal tracking
- Recurring-expense automatic posting (we do carry-forward of categories, but not auto-creating expense rows)
- Mobile native app (PWA only)
- English / other languages
- Email notifications / over-budget alerts

## 12. Open Questions

None — design covers all confirmed requirements.

## 13. Appendix — Mapping from current Google Sheet

| Sheet column                  | App field / KPI                            |
|-------------------------------|---------------------------------------------|
| Categoria                     | `categories.name`                          |
| Budget Previsto               | `categories.expected_amount`               |
| Spesa Effettiva               | `sum(expenses.amount where category_id=c)` |
| Differenza                    | derived (`expected - actual`)              |
| % su Totale Budget            | derived (`expected / total_budget`)        |
| Note                          | `expenses.note` per-transaction; visible by tapping a category row to expand its transaction list |
| Header `Matteo 27/03 – 26/04` | cycle label, derived from `cycle_start_day`|
