# Plan 2 — Wallet CSV Import Design

**Status:** Draft (brainstormed 2026-04-29)
**Roadmap link:** [`docs/ROADMAP.md`](../../ROADMAP.md) §Plan 2
**Supersedes:** the Plan-2 outline in `ROADMAP.md` for any conflicts (this document is the source of truth).

---

## 1. Goal

Let a user import a weekly CSV export from Wallet by BudgetBakers into the budget app. Each import is small (10–30 outcome rows from the last ~7 days), reviewed row-by-row in a staging UI, and committed as `expenses` rows in the appropriate `cycle`. Italian-only UI, mobile-first.

The flow is **incremental, not historical** — running roughly weekly during the current cycle. The very first import a user runs may cover any period from the start of the *current* cycle (onboarding catch-up) but never crosses into past cycles.

## 2. Non-goals

- Generic CSV column mapping. Wallet's exact CSV format only.
- Initial mapping seeding on signup. Mappings are created on first encounter.
- A "skip / ignore" mapping target. To exclude a Wallet category, the user excludes it at export time in Wallet, or unchecks the row in staging.
- A persistent `/import/history` page or a separate `imports` table. Undo is session-scoped.
- Multi-account separation, income import, regex rules, XLS/PDF, bank APIs (out of scope per ROADMAP).

## 3. Architecture

Three new surfaces and one library namespace:

| Path | Type | Responsibility |
|------|------|----------------|
| `src/app/import/page.tsx` | Server Component | Drop-zone host; reads existing mappings + cycle context for the staging UI |
| `src/app/import/_components/staging.tsx` | Client Component | CSV parse, staging list, commit + undo orchestration |
| `src/app/settings/mappings/page.tsx` | Server Component | List Wallet→app mappings |
| `src/app/settings/mappings/_components/edit-drawer.tsx` | Client Component | Edit / delete a single mapping |
| `src/lib/import/` | Pure libraries | `parse.ts`, `filter.ts`, `fingerprint.ts`, `normalize.ts` |
| `src/server/actions/import.ts` | Server Actions | `prepareImportAction`, `commitImportAction`, `undoImportAction` |
| `src/server/queries/import.ts` | Server queries | `getMappings`, `getCategoriesForCycles` |
| `supabase/migrations/0006_import_mappings.sql` | Migration | New `import_mappings` table + RLS |
| `supabase/migrations/0007_expense_import.sql` | Migration | `expenses.fingerprint`, `expenses.import_id`, index |

The browser parses the CSV with `papaparse` so the file never lands on the server uninspected. Only the curated, user-confirmed payload is sent to the commit action.

## 4. Components

### 4.1 CSV parser — `lib/import/parse.ts`

Pure. Input: file text. Output: `WalletRow[]` validated by Zod. Behavior:

- Semicolon delimiter, header row required.
- Reject if any of the required columns is missing: `category`, `amount`, `date`, `type`, `transfer`. Optional columns kept: `note`, `payee`, `account`. All others discarded.
- Italian decimals: `-83,83` → `-83.83`.
- Date `YYYY-MM-DD HH:MM:SS` → ISO date (drop time).
- `transfer` `true|false` → boolean.

Error path: throw a typed `ParseError` with reason. UI surfaces `Formato non riconosciuto`.

### 4.2 Filter — `lib/import/filter.ts`

Pure. Drops rows where any of:

- `type === "Entrate"` (income — only outcomes are imported)
- `transfer === true` (internal transfer between accounts; can occur on `Spese` rows too)
- `amount === 0`

Returns kept rows + a counter `{ entrate, transfer, zero }` for the staging summary.

### 4.3 Name folding — `lib/import/normalize.ts`

Pure. `foldName(s: string)`: lowercase + NFD-strip-accents + collapse whitespace + trim. Used both for Wallet→app exact-name auto-match and for resolving app categories within a cycle.

### 4.4 Fingerprint — `lib/import/fingerprint.ts`

Pure. `fingerprint({ occurredOn, amount, note })` = SHA-256 hex of `${occurredOn}|${amountCents}|${normalizedNote}` where:

- `amountCents = Math.round(Math.abs(amount) * 100)`
- `normalizedNote = (note ?? "").toLowerCase().trim()`

Same function runs in the browser (for within-batch dedup display) and on the server (for cross-batch dedup at insert time).

### 4.5 Resolver — server-side, in `prepareImportAction`

For each row, given the row's target `cycleId` (resolved via `computeCycleForDate(occurredOn, profile.cycle_start_day)`), the resolver computes:

1. If `import_mappings` has a row for `(user_id, wallet_category)` → resolved by **mapping**, target = `app_category_name`.
2. Else if any category in the row's target cycle has `foldName(name) === foldName(walletCategory)` → resolved by **auto-match**, target = the exact app name found.
3. Else → **unmapped**.

Resolution is per-row and per-cycle: a Wallet category that matches by name in cycle A but not in cycle B will be auto-matched in A and unmapped in B. The mapping table is global per user (cycle-independent), but the auto-match step always uses only the row's own cycle's categories.

Auto-matches are *not* persisted to `import_mappings`. They are recomputed every import. Persisting them would create surprise behavior if the user later renames an app category. The user's *explicit* choice on a previously-unmapped category *is* persisted.

### 4.6 Duplicate detector — server-side, in `prepareImportAction`

For each kept row, compute fingerprint. Query `expenses` over the date range of the batch:

```sql
select fingerprint, occurred_on
from expenses
where cycle_id in (...cycles touched by batch...)
  and fingerprint = any($1)
```

Within-batch: same fingerprint twice → flag the second one. Output per row: `isDuplicate: boolean` + (when true) the existing expense's date for the staging hint.

### 4.7 `prepareImportAction(rows: WalletRow[])`

Server action. Input: parsed and filtered rows. Output:

```ts
type PreparedRow = {
  occurredOn: string;
  amount: number;
  note: string | null;
  walletCategory: string;
  cycleId: string | null;       // null = no existing cycle covers this date (will be lazy-created at commit)
  cycleRange: { startDate: string; endDate: string }; // computed even when cycleId is null
  resolved: { kind: "mapping" | "auto"; appCategoryName: string }
          | { kind: "unmapped" };
  isDuplicate: boolean;
};
type Prepared = {
  rows: PreparedRow[];
  cycles: { id: string; startDate: string; endDate: string }[]; // touched cycles, for grouping headers
  categoriesByCycle: Record<string, { id: string; name: string }[]>;
  counts: { kept: number; entrate: number; transfer: number; zero: number; duplicates: number };
};
```

This is purely a read/computation operation — it writes nothing.

### 4.8 `commitImportAction(payload)`

Server action. Input:

```ts
type CommitPayload = {
  rows: { occurredOn: string; amount: number; note: string | null;
          walletCategory: string; appCategoryName: string }[];
  pendingMappings: { walletCategory: string; appCategoryName: string }[];
};
```

Steps (in order, in a single server-side flow — no DB transaction wrapper required because all operations are scoped to the user via RLS and we abort early on any error):

1. Validate with Zod.
2. Generate `importId = crypto.randomUUID()`.
3. For each row: `cycleId = await ensureCycleForDate(occurredOn)` (existing helper from `expense.ts` — extract to `lib/db/ensure-cycle.ts` so import + expense share it).
4. For each row: look up `categoryId` by `foldName` match within `cycleId`. If no match: abort with `{ error: "Categoria 'X' non esiste nel ciclo Y." }` — no partial commit.
5. Compute fingerprint server-side (do not trust the client's).
6. `supabase.from("expenses").insert(rows).select("id")` — bulk insert with shared `import_id`.
7. `supabase.from("import_mappings").upsert(pendingMappings, { onConflict: "user_id,wallet_category" })`.
8. `revalidatePath("/")` and return `{ importId, count }`.

Note: this action is called from a Client Component with a JSON payload — *not* via `<form action>`. We do not use `useActionState` here because the staging UI manages its own pending/error state. Keep the action signature `(payload: CommitPayload) => Promise<Result>`, not the `(state, formData)` shape used by the auth pages.

### 4.9 `undoImportAction(importId: string)`

Server action. Deletes all `expenses` with that `import_id` belonging to the user. RLS enforces ownership. Returns `{ deleted: number }`.

Surfaced only on the success screen of the just-finished import. Once the user navigates away, the success screen is gone and the `importId` is no longer on the page — undo is not exposed elsewhere. This is intentional: the `imports` history table was explicitly dropped.

## 5. Data model

### 5.1 New table: `import_mappings`

```sql
-- supabase/migrations/0006_import_mappings.sql
create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_category text not null,
  app_category_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wallet_category)
);

alter table public.import_mappings enable row level security;

create policy "import_mappings_select_own" on public.import_mappings
  for select using (auth.uid() = user_id);
create policy "import_mappings_insert_own" on public.import_mappings
  for insert with check (auth.uid() = user_id);
create policy "import_mappings_update_own" on public.import_mappings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "import_mappings_delete_own" on public.import_mappings
  for delete using (auth.uid() = user_id);

create index idx_import_mappings_user on public.import_mappings (user_id);
```

### 5.2 Schema additions

```sql
-- supabase/migrations/0007_expense_import.sql
alter table public.expenses
  add column fingerprint text,
  add column import_id uuid;

create index idx_expenses_cycle_fingerprint
  on public.expenses (cycle_id, fingerprint);
```

Both columns are nullable. Existing manually-entered expenses keep `null` for both — that's fine; fingerprint is only used for dedup against new imports, and `import_id` is only used for undo.

After migration, regenerate types: `pnpm db:types`.

## 6. UI / UX

The visual language follows `DESIGN.md` strictly: terracotta-on-clay, mid-century Italian printed matter, "il quaderno delle spese". DM Serif Display for editorial moments, DM Sans for body, DM Mono for numerics. All colors/spacing/radii from existing tokens.

### 6.1 `/import` page layout (mobile, ≤420 px)

```
┌──────────────────────────────────────┐
│ ← Importa da Wallet            [≡]   │  ← header (existing pattern)
├──────────────────────────────────────┤
│                                      │
│   ┌─ — — — — — — — — — — — — — ─┐    │
│   │                              │   │
│   │   Lascia qui il file Wallet  │   │  ← drop zone, see 6.2
│   │   Solo CSV · max 5 MB        │   │
│   │                              │   │
│   └─ — — — — — — — — — — — — — ─┘    │
│                                      │
└──────────────────────────────────────┘
```

After successful parse + `prepareImportAction`, the drop zone is replaced by the staging view (6.3).

### 6.2 Drop zone

- `surface` background, single 1 px `clay-300` hairline rule along the top edge, single thin 2 px `terra-500` accent stripe at the left edge.
- Headline in DM Serif Display (`text-2xl`, `clay-800`): **"Lascia qui il file Wallet"**.
- Sub-line in DM Sans (`text-sm`, `clay-500`): "Solo CSV · max 5 MB".
- No icon. No dashed border. Min height 240 px.
- Drag-over state: background → `clay-200`, left stripe thickens 2 → 3 px. 150 ms transition on `background-color` only.
- Tap target = full zone (also opens a hidden file input).
- Reject non-`.csv` extensions client-side with toast `Formato non riconosciuto`.

### 6.3 Staging view layout

```
┌──────────────────────────────────────┐
│ ← Importa da Wallet                  │
├──────────────────────────────────────┤
│ "22 spese da Wallet · 27 apr – 3 mag"│  ← editorial subtitle (DM Serif Display italic)
├──────────────────────────────────────┤
│  ┌── sticky summary ──┐              │
│  │     12             │              │  ← DM Serif Display, text-5xl, clay-900
│  │     DA IMPORTARE   │              │  ← DM Sans, text-xs, tracking-wider, clay-600
│  │  3 duplicati · 4 escluse          │  ← DM Mono, text-xs, clay-500
│  └────────────────────┘              │
├──────────────────────────────────────┤
│  Ciclo precedente · 27/03 – 26/04    │  ← grouping header, only when batch spans 2 cycles
│  ─────────────────────────────────   │
│  ┌─ row ────────────────────────┐    │
│  │ 26/04          € 83,83       │    │  ← date left (mono), amount right (mono tabular)
│  │ CARBURANTE                   │    │  ← wallet category, DM Sans small caps, clay-600
│  │ → Trasporti           [▾]    │    │  ← app category dropdown, "→" glyph in clay-400
│  │ Benzina Marzo               ✓│    │  ← note (italic) + checkbox glyph right-edge
│  └──────────────────────────────┘    │
│  ─────────────────────────────────   │  ← single hairline border-muted divider
│  ... more rows ...                   │
├──────────────────────────────────────┤
│ ┌── sticky footer ────────────────┐  │
│ │  Importa 12 spese · € 234,50    │  │  ← terra-500 button, mono digits
│ └─────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 6.4 Editorial subtitle

Single italic DM Serif Display line above the rows: `{N} spese da Wallet · {DD MMM} – {DD MMM}` where dates are min/max `occurred_on`. `text-lg`, `clay-700`. Italian month names short form ("apr", "mag"). Format helper: extend `lib/format/date.ts` with `formatRangeShort`.

### 6.5 Sticky summary header

- Position: sticky top, blur-backdrop on the `clay-100` page background (`backdrop-blur-sm bg-clay-100/85`).
- Big number in DM Serif Display `text-5xl` `clay-900`.
- Label below in DM Sans `text-xs uppercase tracking-wider` `clay-600`.
- Sub-stats (`{D} duplicati · {E} escluse`) in DM Mono `text-xs` `clay-500`.
- Replaces a generic "X · Y · Z" sentence — this is the magazine-headline moment.

### 6.6 Row anatomy

| Slot | Style |
|------|-------|
| Date | DM Mono `text-sm` `clay-700`, left-aligned |
| Amount | DM Mono `text-base font-medium` `clay-900`, right-aligned, tabular-nums |
| Wallet category | DM Sans `text-xs uppercase tracking-wide` `clay-600` |
| `→` glyph | DM Sans `text-sm` `clay-400`, separating wallet from app dropdown |
| App category dropdown | shadcn Select trigger, h-11 (≥44 px), inline label-style |
| Note | DM Sans italic `text-sm` `clay-700`, max 2 lines, `line-clamp-2` |
| Include checkbox | 24×24 glyph anchored right edge; whole-row tap toggles (excluding dropdown) |
| Divider between rows | 1 px `border-muted` |
| Row min height | 96 px (mobile) |

No box shadows. No card backgrounds (rows sit directly on `background`).

### 6.7 Status semantics — gutter, not pills

Reserve the budget-state palette (sage / amber / sienna) for budget UI elsewhere. Import status uses the row's gutter and typography:

- **Duplicato:** row background → `clay-200`, amount struck-through, checkbox unchecked, the wallet-category line gains a trailing word `· duplicato` in `clay-500` small caps. No badge pill.
- **Da assegnare** (replaces "Categoria mancante"): 2 px left border in `terra-500`, dropdown placeholder text "Scegli categoria…" in `terra-500`. When the user picks one, the propagation animates (6.10).

### 6.8 Inline category dropdown — bottom sheet on mobile

shadcn `Drawer` (not `Select` popover). Trigger looks like an inline label-style field. Drawer header is the cycle range *"Ciclo {DD/MM} – {DD/MM}"* the row belongs to. Body is a scrollable list of categories from that cycle. Each option ≥44 px tall. Selecting closes the drawer.

This avoids cropped popovers at ≤420 px and gives enough space for users with many categories.

### 6.9 Cycle-boundary grouping

When the batch spans two cycles, render a section header between groups:

```
Ciclo precedente · 27/03 – 26/04
```

DM Serif Display italic `text-base` `clay-700`, with a hairline `clay-300` rule below. Most weeks (when the import is fully within the current cycle) this header doesn't appear at all. Replaces a per-row "fuori dal ciclo corrente" badge.

### 6.10 Sticky footer commit button

Full-width `terra-500` button, h-12, anchored to the bottom of the viewport with `safe-area-inset-bottom` padding.

| State | Copy |
|-------|------|
| Enabled | `Importa 12 spese · € 234,50` (count + total of *included* rows) |
| Disabled — unmapped rows present | `Risolvi 2 categorie da assegnare` |
| Disabled — nothing included | `Seleziona almeno una spesa` |
| Pending | `Importazione in corso…` (button stays terra, text becomes `accent-foreground` at 70% opacity) |

The total uses tabular DM Mono digits. Domain-fitting: showing money on a money-committing button.

### 6.11 Row interactions

- Whole row toggles the include checkbox **except** when the tap lands on the dropdown trigger.
- Dropdown trigger ≥44 px tall, ≥44 px wide minimum.
- Picking a category for an unmapped row **propagates to all sibling rows in the batch with the same Wallet category** and queues a `pendingMappings` entry. The user can still per-row override after that.

### 6.12 Motion

- **Page-load reveal** for staging rows: each row `opacity 0 → 1` and `translateY(6px) → 0`, 200 ms, `animation-delay: calc(var(--i) * 30ms)` capped at index 12 (don't stagger beyond the first ~12 rows).
- **Mapping propagation** when the user picks a category for an unmapped row: 200 ms `clay-200 → surface` background flush on the sibling rows that just got resolved. Eases the propagation visually.
- No bounce, no scale, no other motion. The system explicitly forbids bouncy.
- Respect `prefers-reduced-motion` — reduce all of the above to opacity-only or no animation.

### 6.13 Success screen

Replaces the staging view in-place after a successful commit:

```
        Spese annotate
        12 voci · 27 apr – 3 mag

        [ Annulla ]   [ Vai alla dashboard ]
```

- Headline DM Serif Display `text-3xl` `clay-900`.
- Sub-line DM Mono `text-sm` `clay-600`.
- `Annulla` is a secondary terracotta-outlined button. Calls `undoImportAction(importId)`. After undo: success becomes `Importazione annullata` and `Annulla` disappears.
- `Vai alla dashboard` is a tertiary text link.

### 6.14 `/settings/mappings` page

```
┌──────────────────────────────────────┐
│ ← Mappature Wallet                   │
├──────────────────────────────────────┤
│ Carburante      →  Trasporti      ›  │
│ Spesa           →  Spesa          ›  │
│ Software, App e Giochi → Software ›  │
│  ...                                 │
└──────────────────────────────────────┘
```

- One tap row per mapping; full row tappable, opens an edit drawer.
- Left = `wallet_category` in DM Sans `clay-700`, right = `app_category_name` in DM Sans `clay-900`, `→` glyph in `clay-400` between them. Truncate long names with ellipsis.
- Empty state: a single italic DM Serif Display line *"Le mappature appariranno qui dopo il primo import."* `text-base clay-500`, centered, no card, no SVG.

### 6.15 Mapping edit drawer

shadcn `Drawer`. Body:

- Read-only label `Wallet:` followed by the `wallet_category` value.
- Editable input `Categoria:` containing the `app_category_name`. Free text — no validation against existing app categories at this layer. (If after editing the new name doesn't match anything in a future import's target cycle, the user re-maps in staging. That's acceptable.)
- Buttons: `Salva` (terra-500), `Elimina` (sienna-500 outline).

Calls `updateMappingAction` and `deleteMappingAction` — both standard one-row server actions. (Adds two more thin actions to `server/actions/import.ts`.)

### 6.16 Italian copy additions to `lib/copy.ts`

```ts
import: {
  title: "Importa da Wallet",
  drop: "Lascia qui il file Wallet",
  dropHint: "Solo CSV · max 5 MB",
  parsing: "Lettura file…",
  parseError: "Formato non riconosciuto",
  subtitle: (n: number, range: string) => `${n} spese da Wallet · ${range}`,
  summaryLabel: "DA IMPORTARE",
  summaryStats: (dup: number, excl: number) => `${dup} duplicati · ${excl} escluse`,
  duplicatedTag: "duplicato",
  unmappedPlaceholder: "Scegli categoria…",
  cyclePrev: (range: string) => `Ciclo precedente · ${range}`,
  cycleCurrent: (range: string) => `Ciclo corrente · ${range}`,
  commitEnabled: (n: number, total: string) => `Importa ${n} spese · ${total}`,
  commitUnmapped: (n: number) => `Risolvi ${n} categorie da assegnare`,
  commitNoneSelected: "Seleziona almeno una spesa",
  commitPending: "Importazione in corso…",
  successTitle: "Spese annotate",
  successSubtitle: (n: number, range: string) => `${n} voci · ${range}`,
  undo: "Annulla",
  undone: "Importazione annullata",
  goDashboard: "Vai alla dashboard",
},
mappings: {
  title: "Mappature Wallet",
  empty: "Le mappature appariranno qui dopo il primo import.",
  walletLabel: "Wallet:",
  appLabel: "Categoria:",
  save: "Salva",
  delete: "Elimina",
}
```

### 6.17 Navigation

- New top-level nav entry "Importa" added to the header alongside `Categorie` and `Impostazioni`.
- `/settings` page gains a row "Mappature Wallet" linking to `/settings/mappings`.

## 7. Data flow end-to-end

```
[Browser]
  drop file
    → papaparse → string headers/rows
    → lib/import/parse.ts → WalletRow[] | ParseError
    → lib/import/filter.ts → { kept, counts }
    → POST kept rows to prepareImportAction
[Server]
    → resolve mappings + auto-match per cycle
    → fingerprint + dedup query
    → return Prepared
[Browser]
    → render staging view, user reviews
    → user picks categories for unmapped, toggles include
    → click "Importa N spese"
    → POST CommitPayload to commitImportAction
[Server]
    → ensureCycleForDate per row
    → resolve categoryId per row
    → bulk insert expenses with shared import_id
    → upsert pendingMappings
    → return { importId, count }
[Browser]
    → success screen with Annulla button
    → optional: undoImportAction(importId)
```

## 8. Edge cases

| Case | Behavior |
|------|----------|
| File not CSV / wrong headers | Toast `Formato non riconosciuto`, no parse, no network call. |
| Row missing `date` or `amount` | Drop with count, surfaced as `escluse`. |
| Row's `occurred_on` outside the current cycle but inside an existing past cycle | Render under "Ciclo precedente" group header. No special prompt. |
| Row's `occurred_on` doesn't fall in any existing cycle | Onboarding case: cycle gets lazy-created via `ensureCycleForDate`. The new cycle has no categories yet, so any unmapped row will be in "Da assegnare" state — user must map before commit, and the commit step will fail with `Categoria 'X' non esiste nel ciclo Y` if the category name doesn't exist in that cycle. The user resolves by either creating the category in `/categories` first or using a different mapping. |
| Mapped app category name doesn't exist in the row's cycle at commit time | Server aborts the commit with `Categoria 'X' non esiste nel ciclo Y. Crea la categoria o aggiorna la mappatura.` Row insertions are atomic — no partial commit. |
| App category renamed between prepare and commit | Server re-resolves at commit. If the old name disappears, error as above and the user re-opens `/import`. |
| All rows are duplicates | Commit allowed (creates 0 expenses). Toast `Nessuna nuova spesa` and skip the success screen. |
| Two genuinely identical expenses on the same day with the same note | First gets inserted, second flagged as duplicate (pre-unchecked). User can override the checkbox to force-include the second. |
| Refresh during staging | Parsed state lives in client state only. Refresh discards it; user re-uploads. (Acceptable — small file, weekly cadence.) |
| Network failure during commit | Action returns `{ error }`; staging state preserved; user retries. No partial inserts because we use a single `.insert(rows)` call. |
| Network failure during undo | Action returns `{ error }`; success screen shows error + retry. |

## 9. Testing

### Unit (`tests/unit/import/`)

- `parse.test.ts`: Italian decimal handling (`-83,83` → `-83.83`), date stripping, missing-header rejection, semicolon-vs-comma rejection.
- `filter.test.ts`: `Entrate` dropped, `transfer=true` (even on `Spese` rows) dropped, `amount=0` dropped, counters correct.
- `fingerprint.test.ts`: stability (same inputs → same hash), case-insensitivity of note, sign-insensitivity of amount, empty-note normalization.
- `normalize.test.ts`: accent strip (`È` → `e`), case fold, whitespace collapse.

### Integration (`tests/integration/import/`)

- `commit.test.ts`: insert N rows with shared `import_id`, names resolve to correct cycle's categories, fingerprint stored.
- `mappings.test.ts`: upsert creates new, second-time updates same row (no duplicate). Cross-user mapping read denied (RLS).
- `undo.test.ts`: deletes only own batch by `import_id`. Cross-user undo denied (RLS).
- `dedup.test.ts`: prepareImportAction flags rows whose fingerprint already exists in the user's expenses.

### E2E (Playwright, `tests/e2e/import/`)

- Sample fixture: `tests/fixtures/wallet/report_2026-04-28_155541.csv` (anonymized copy of the user's real export — strip GPS, payee IBANs, replace names; keep category/amount/date/note structure).
- Flow: login → `/import` → drop fixture → staging summary counts match expected → assign one unmapped category (verify drawer opens, propagation animates) → commit → success screen visible → dashboard reflects new totals → click `Annulla` → totals restored.

### Manual verification checklist (mobile viewport 375×667)

- Drop zone tap-area ≥44 px in every direction.
- Row whole-tap toggles checkbox; tapping the dropdown does NOT toggle.
- Drawer covers ≤80% viewport height; scrollable; `safe-area-inset-bottom` honored.
- Sticky header + footer don't overlap any row content (test at viewport with virtual keyboard open).
- Color contrast spot-check on `terra-500` text on `clay-100`, `clay-500` on `clay-200` (duplicato row).

## 10. Implementation order suggestion (for the planner)

1. Migrations 0006 + 0007, regenerate types.
2. Pure libraries (`parse`, `filter`, `normalize`, `fingerprint`) with unit tests.
3. Server queries (`getMappings`, `getCategoriesForCycles`) + extract `ensureCycleForDate` to shared util.
4. `prepareImportAction` + integration tests (without UI).
5. `commitImportAction` + `undoImportAction` + integration tests.
6. `/import` page + drop zone + staging UI + propagation logic.
7. `/settings/mappings` page + edit drawer + actions.
8. Italian copy additions to `lib/copy.ts`.
9. E2E test against the anonymized fixture.
10. Update `CLAUDE.md` for the new `lib/import` namespace and the `/import` + `/settings/mappings` routes.

## 11. Open questions deferred to plan 3 (or later)

- Persist auto-match decisions opportunistically? (Currently recomputed every import.)
- Multi-cycle backfill (>1 cycle into the past).
- Import history page with delete-by-import-id beyond session.
- Skip-category mappings (`Wallet → ignore`).
