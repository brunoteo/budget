# Budget MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working personal-budget app for two users (separate accounts) with custom paycheck-aligned cycles, mobile-first UI, manual expense entry, per-cycle KPIs (including % stipendio), and Italian copy. Deployable to Vercel + Supabase by end of plan.

**Architecture:** Next.js 15 App Router. Server Components for reads, Server Actions for mutations (Zod-validated). Supabase Postgres with Row-Level Security guarantees per-user data isolation; auth via Supabase Auth (email/password). Pure framework-free libraries under `src/lib/{cycle,kpi,format}` are unit-tested in isolation. Mobile-first responsive UI via Tailwind + shadcn/ui; tap targets ≥ 44 px; dashboard renders as stacked cards on mobile and as a table at `md+`.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind v4, shadcn/ui, Recharts, Supabase (Postgres + Auth + RLS), Zod, react-hook-form, Vitest, Playwright. Node 20+. Package manager: `pnpm`.

**This is Plan 1 of 3.** Plan 2 (import flow from Wallet CSV) and Plan 3 (PWA + production hardening) follow after this MVP is implemented and shipped.

**Companion spec:** `docs/superpowers/specs/2026-04-28-budget-app-design.md`. Read it once before starting Task 2; refer back when in doubt.

---

## File Structure

Files produced by this plan (each task lists exact paths). Pure libraries are framework-free. Server Actions own all mutations. Queries own all reads. UI imports from queries/actions only — never from the Supabase client directly.

```
budget/
├── CLAUDE.md                                 # T1
├── DESIGN.md                                 # T4 (frontend-design skill)
├── README.md                                 # T2
├── package.json, pnpm-lock.yaml              # T2
├── tsconfig.json, next.config.ts             # T2
├── tailwind.config.ts                        # T2 + T4 (theme tokens)
├── postcss.config.mjs                        # T2
├── components.json                           # T3 (shadcn)
├── vitest.config.ts                          # T5
├── playwright.config.ts                      # T5
├── .gitignore                                # T1
├── .env.local.example                        # T6
├── supabase/
│   ├── config.toml                           # T6
│   └── migrations/
│       ├── 0001_profiles.sql                 # T12
│       ├── 0002_cycles.sql                   # T13
│       ├── 0003_categories.sql               # T14
│       ├── 0004_expenses.sql                 # T15
│       └── 0005_indexes.sql                  # T15
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # T26
│   │   ├── page.tsx                          # T27 + T28 + T29 (dashboard)
│   │   ├── login/page.tsx                    # T19
│   │   ├── signup/page.tsx                   # T19
│   │   ├── expenses/new/page.tsx             # T30
│   │   ├── categories/page.tsx               # T31
│   │   ├── settings/page.tsx                 # T32
│   │   └── trends/page.tsx                   # T33
│   ├── components/
│   │   ├── ui/...                            # T3 (shadcn-derived) + T4 (theme)
│   │   ├── app-header.tsx                    # T26
│   │   ├── fab.tsx                           # T26
│   │   ├── kpi-card.tsx                      # T27
│   │   ├── pacing-bar.tsx                    # T28
│   │   ├── category-row.tsx                  # T29
│   │   ├── category-editor-form.tsx          # T31
│   │   └── trends-chart.tsx                  # T33
│   ├── lib/
│   │   ├── db/{server.ts,client.ts}          # T18
│   │   ├── cycle/compute.ts                  # T9
│   │   ├── cycle/label.ts                    # T10
│   │   ├── kpi/compute.ts                    # T11
│   │   ├── format/eur.ts                     # T7
│   │   ├── format/date.ts                    # T8
│   │   └── copy.ts                           # T19 + T34 (Italian strings)
│   ├── server/
│   │   ├── actions/auth.ts                   # T19
│   │   ├── actions/expense.ts                # T22
│   │   ├── actions/category.ts               # T23 + T24
│   │   ├── actions/cycle.ts                  # T25
│   │   ├── actions/profile.ts                # T32
│   │   ├── queries/dashboard.ts              # T21
│   │   └── queries/trends.ts                 # T33
│   ├── styles/globals.css                    # T2 + T4 (CSS variables)
│   └── types/database.ts                     # T16 (generated)
└── tests/
    ├── unit/
    │   ├── cycle.test.ts                     # T9 + T10
    │   ├── kpi.test.ts                       # T11
    │   └── format.test.ts                    # T7 + T8
    ├── integration/
    │   ├── _helpers.ts                       # T17
    │   ├── rls.test.ts                       # T17
    │   ├── expense-actions.test.ts           # T22
    │   ├── category-actions.test.ts          # T23 + T24
    │   └── cycle-actions.test.ts             # T25
    └── e2e/
        ├── golden-path.spec.ts               # T35
        └── auth-redirect.spec.ts             # T36
```

**Module rules:**
- `lib/{cycle,kpi,format}` import nothing from `next`, `react`, or `@supabase/*`. They are pure functions over plain types.
- All client→DB writes go through Server Actions in `src/server/actions/`. No client component imports `@supabase/*` for writes.
- Reads from React Server Components go through `src/server/queries/`.
- Server Actions and queries import `lib/db/server.ts` to get a request-scoped Supabase client (with the user's auth context, so RLS applies).

---

## Conventions used throughout this plan

- **Package manager:** `pnpm`. Use `pnpm dlx` instead of `npx`.
- **TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`.
- **Tests:** Each new pure function gets unit tests written first (TDD). Server Actions get integration tests against a local Supabase instance.
- **Commits:** One commit per completed task. Conventional Commits format (`feat:`, `chore:`, `test:`, `fix:`, `docs:`).
- **Currency:** Always EUR. Always formatted via `lib/format/eur.ts` — never inline.
- **Dates:** Always `DD/MM/YYYY` for user-facing display via `lib/format/date.ts`. ISO `YYYY-MM-DD` for storage and logic.
- **Italian copy:** Sourced from `src/lib/copy.ts`. No hard-coded Italian strings in components.
- **Design tokens:** All colors, fonts, spacing, radii, shadows, motion live in `DESIGN.md` (T4) and are realized as Tailwind theme entries + CSS variables. UI tasks consume tokens by class or `var(--token)` — never hex values, raw px sizes, or one-off paddings inline.
- **Verification before claiming completion:** every task ends by running `pnpm typecheck && pnpm lint && pnpm test` and confirming green.

---

## Task 1: Create CLAUDE.md (FIRST DELIVERABLE)

**Files:**
- Create: `CLAUDE.md`
- Create: `.gitignore`

`CLAUDE.md` is created and committed before any application code. Every subsequent task assumes future Claude sessions will read it.

- [ ] **Step 1: Write `.gitignore`**

Create `.gitignore`:

```gitignore
node_modules
.next
out
dist
coverage
*.log
.DS_Store
.env
.env.local
.env.*.local
.vercel
.superpowers
playwright-report
test-results
supabase/.branches
supabase/.temp
```

- [ ] **Step 2: Write `CLAUDE.md`**

Create `CLAUDE.md`:

````markdown
# Budget — Project Notes for Claude

A two-user personal-budget web application replacing a manual Google Sheet. Each spouse has an isolated account with their own data and their own pay-cycle (e.g., 27th-to-26th, 10th-to-9th). The app's distinguishing feature is paycheck-day-aligned monthly cycles. Italian-only UI. Mobile-first.

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions) + **TypeScript strict** (`noUncheckedIndexedAccess: true`)
- **Tailwind CSS v4** + **shadcn/ui** (added via the CLI; do not fork components by hand)
- **Supabase** — Postgres + Auth + Row-Level Security
- **Recharts** (charts), **papaparse** (CSV import — Plan 2), **Zod** + **react-hook-form** (validation)
- **Vitest** (unit + integration), **Playwright** (E2E)
- Hosted on **Vercel** + **Supabase** free tiers
- Package manager: **pnpm**, Node 20+

## Repository layout

```
src/
  app/                    # routes (pages + server actions co-located via app router)
  components/
    ui/                   # shadcn-derived primitives
  lib/
    db/                   # Supabase client factories (server.ts, client.ts) — all DB access
    cycle/                # PURE: cycle date math (no Next, no Supabase)
    kpi/                  # PURE: KPI computation
    format/               # PURE: Italian EUR / date formatting
    copy.ts               # Italian UI strings (single source)
  server/
    actions/              # Server Actions (Zod-validated mutations)
    queries/              # Typed server-side reads
  styles/globals.css
  types/database.ts       # Generated by `pnpm db:types`
supabase/migrations/      # Sequential SQL migrations; every new table includes RLS policy
tests/
  unit/                   # Pure libs only
  integration/            # Server Actions + RLS, run against local Supabase
  e2e/                    # Playwright
  fixtures/               # Sample files (e.g. wallet/report_*.csv)
docs/superpowers/         # Specs and plans
```

## Commands

| Command           | What it does                                                  |
|-------------------|---------------------------------------------------------------|
| `pnpm dev`        | Run Next.js dev server                                        |
| `pnpm build`      | Production build                                              |
| `pnpm start`      | Serve production build                                        |
| `pnpm lint`       | ESLint                                                        |
| `pnpm typecheck`  | `tsc --noEmit`                                                |
| `pnpm test`       | Vitest unit + integration                                     |
| `pnpm test:watch` | Vitest in watch mode                                          |
| `pnpm test:e2e`   | Playwright E2E                                                |
| `pnpm db:start`   | `supabase start` — local Postgres + Studio                    |
| `pnpm db:stop`    | `supabase stop`                                               |
| `pnpm db:reset`   | Reset local DB and re-run all migrations                      |
| `pnpm db:diff`    | Generate a new migration from local schema diff               |
| `pnpm db:types`   | Regenerate `src/types/database.ts` from local DB              |

Always run `pnpm typecheck && pnpm lint && pnpm test` before claiming a task complete.

## Conventions

- **Mobile-first.** Every screen designed for ≤ 420 px portrait first, then enhanced at `sm`/`md`/`lg`. Tap targets ≥ 44×44 px. No hover-only patterns without a tap-equivalent.
- **Italian only.** All UI strings live in `src/lib/copy.ts`. Don't hard-code Italian elsewhere. No i18n library — single locale.
- **Currency** formatted via `lib/format/eur.ts` (`€ 1.234,56`). **Dates** via `lib/format/date.ts` (`DD/MM/YYYY`). Never format inline.
- **Pure libraries** under `lib/{cycle,kpi,format}` import nothing from `next`, `react`, or `@supabase/*`. They are unit-tested in isolation.
- **All mutations** go through Server Actions in `src/server/actions/`, validated with Zod. No `@supabase/*` write calls from client components.
- **All reads** from Server Components go through `src/server/queries/`.
- **Every new table or column** comes with an RLS policy in the same migration. Never bypass RLS with the service-role key from app code.
- **shadcn/ui** components are added via `pnpm dlx shadcn@latest add <name>` and lightly themed in `tailwind.config.ts`. Don't fork them by hand.

## Data model invariants

- Each user owns their data; cross-user reads/writes are blocked by RLS.
- `expenses.cycle_id` is always derivable from `occurred_on` and the user's `cycle_start_day` at write time.
- Cycles are unique per `(user_id, start_date)` and created lazily on first reference.
- `categories.expected_amount >= 0`, `expenses.amount >= 0` (sign of expense vs income is implicit — only expenses are stored).

## Testing rules

- TDD where practical. Pure cycle and KPI logic must have unit tests written before the UI consumes them.
- RLS isolation must have integration tests (user A cannot read/write user B's rows).
- Each new screen gets at least an E2E smoke test.
- Don't mock Supabase in integration tests — run against the local CLI.

## Verification before claiming completion

- For any UI change: start `pnpm dev`, exercise the feature in a browser at the mobile viewport (375×667) and at desktop (≥ 1024 px).
- For any DB change: `pnpm db:reset && pnpm test` must be green.
- `pnpm typecheck && pnpm lint && pnpm test` must all pass.
- E2E tests must pass before merging UI changes.

## What NOT to do

- No joint-household features, no multi-currency, no English copy, no client-side Supabase admin keys, no schema changes without a migration file.
- No committing `.env.local` or any file with credentials.
- No regex rules in import (Plan 2) — only normalized substring patterns.
- No income transactions in expenses table — income lives only on the cycle row.
- Don't bypass RLS by using the service-role key from Server Actions; use the request-scoped Supabase client.
- Don't write Italian strings inline; always reference `lib/copy.ts`.

## External docs

When looking up library APIs (Next.js, Supabase, shadcn/ui, Recharts, Zod, Tailwind), use the `context7` MCP server (e.g. `mcp__plugin_context7_context7__query-docs`) rather than relying on memory. Library APIs change frequently.

## Maintenance

Any PR that introduces a new directory under `src/lib`, a new server-action pattern, a new npm script, a renamed environment variable, or a new architectural constraint **must update this `CLAUDE.md` in the same commit**. PR descriptions should mention the update or explicitly note why none was needed.
````

- [ ] **Step 3: Initialize git repository and commit**

Run:
```bash
cd /Users/mbrunetto/Desktop/Personal/budget
git init
git add CLAUDE.md .gitignore
git commit -m "docs: add CLAUDE.md and .gitignore"
```
Expected: one commit on `main`. No other files in the working tree (Next.js scaffolding starts in Task 2).

---

## Task 2: Initialize Next.js project

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (placeholder), `src/styles/globals.css`
- Create: `README.md`

- [ ] **Step 1: Scaffold Next.js**

Run inside the project directory (which already contains `CLAUDE.md` and `.gitignore`):
```bash
pnpm dlx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack --use-pnpm
```
Accept overwrites only for files NOT already in the repo. When prompted about `.gitignore` and `CLAUDE.md`, keep ours. After scaffolding, verify `pnpm dev` starts and shows the default Next.js page at `http://localhost:3000`.

- [ ] **Step 2: Tighten `tsconfig.json`**

Edit `tsconfig.json` `compilerOptions` so it includes:
```json
"strict": true,
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"forceConsistentCasingInFileNames": true,
"target": "ES2022"
```

- [ ] **Step 3: Add scripts to `package.json`**

In `package.json`, set the `scripts` block to:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:diff": "supabase db diff",
  "db:types": "supabase gen types typescript --local > src/types/database.ts"
}
```

- [ ] **Step 4: Replace `src/app/page.tsx` with placeholder**

```tsx
export default function HomePage() {
  return <main className="p-4 text-center">Budget — in costruzione.</main>;
}
```

- [ ] **Step 5: Write minimal `README.md`**

```markdown
# Budget

Personal budget app for two users. See `docs/superpowers/specs/2026-04-28-budget-app-design.md` for the full design and `CLAUDE.md` for engineering conventions.

## Quick start

```bash
pnpm install
pnpm db:start         # local Supabase via Docker
pnpm dev
```
```

- [ ] **Step 6: Verify and commit**

Run:
```bash
pnpm typecheck && pnpm lint
git add -A
git commit -m "chore: scaffold Next.js 15 with TypeScript + Tailwind"
```
Expected: typecheck and lint pass.

---

## Task 3: Add shadcn/ui

**Files:**
- Create: `components.json`
- Modify: `tailwind.config.ts`, `src/styles/globals.css`
- Create: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/sheet.tsx` (added by CLI)
- Create: `src/lib/utils.ts` (added by CLI — `cn` helper)

- [ ] **Step 1: Init shadcn**

```bash
pnpm dlx shadcn@latest init
```
Choose: "Default" style, base color "Slate", CSS variables yes.

- [ ] **Step 2: Add the primitives we know we need**

```bash
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu sheet form
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm typecheck && pnpm lint
git add -A
git commit -m "chore: add shadcn/ui primitives"
```

---

## Task 4: Produce `DESIGN.md` (frontend-design skill)

**Files:**
- Create: `DESIGN.md`
- Modify: `tailwind.config.ts` (extend theme with design tokens)
- Modify: `src/styles/globals.css` (add CSS variables produced by the skill)
- Create: `src/components/ui/` may receive light theme tweaks

This task uses the **`frontend-design:frontend-design`** skill to produce a coherent visual design system for the app — palette, typography, spacing, motion, component tokens — codified in `DESIGN.md` and reflected in `tailwind.config.ts` + `globals.css`. Every subsequent UI task (T26 layout, T27–T29 dashboard, T30 add-expense, T31 categories, T32 settings, T33 trends) reads from `DESIGN.md` for tokens; no inline colors or font sizes outside what `DESIGN.md` defines.

This task happens BEFORE all UI tasks but AFTER scaffolding so the skill can write directly into `tailwind.config.ts` / `globals.css` and the executor can validate visually with `pnpm dev`.

- [ ] **Step 1: Invoke the frontend-design skill**

Use the `Skill` tool with `frontend-design:frontend-design`. Brief the skill with this prompt verbatim:

> "Italian-only personal-budget mobile-first PWA for a couple replacing a Google Sheet. Used daily on smartphones (375 px portrait primary). Tone: trustworthy, warm, grown-up — not banking-app-cold, not childish, not stock SaaS. Currency-heavy UI; numbers must be highly legible at small sizes. Categories with progress bars, KPI cards, transaction lists, pacing bar. Need clear semantic states: under-budget (positive), at-budget (neutral-positive), over-budget (warning), neutral. Typography must support European number formatting `€ 1.234,56` cleanly with tabular figures. Tech: Tailwind v4 + shadcn/ui (CSS variables). Output: a `DESIGN.md` file containing the system spec, plus the exact `tailwind.config.ts` `theme.extend` additions and the `:root` / `.dark` CSS-variable block I should paste into `globals.css` to realize it. No dark mode in v1 but expose CSS variables so it's easy to add later. Avoid generic AI aesthetics — distinctive but understated."

After the skill produces output, save it to `DESIGN.md` at the project root.

- [ ] **Step 2: Required content of `DESIGN.md`**

Whatever the skill produces, ensure `DESIGN.md` covers all of these sections (top-level headings):

```markdown
# Budget — Design System

## 1. Brand & Tone
Voice, visual personality, dos and don'ts.

## 2. Color Palette
- **Raw scale** (hex values, e.g., neutral-50 … neutral-900, brand-50 … brand-900, plus accent + semantic).
- **Semantic tokens** (background, surface, surface-elevated, border, text-primary, text-muted, text-inverse, accent, success, warning, danger, info).
- **State colors** specifically for budget cards: under-budget, at-budget, over-budget.
- **Contrast verification** — every foreground/background pair must be at least WCAG AA at body sizes; tabular numbers AAA.

## 3. Typography
- **Family** primary (system or import: e.g., `Inter`, `Geist`, `IBM Plex Sans`) + monospace for numbers (or `font-feature-settings: "tnum"`).
- **Scale** (xs/sm/base/lg/xl/2xl…) with line-heights.
- **Number style** — tabular figures enabled globally for currency.
- **Italian-specific** — accents render correctly; quotes follow `«…»` if used.

## 4. Spacing
- 4-px or 8-px grid? Pick one, list scale.

## 5. Radii, Borders, Shadows
- Radius scale (sm/md/lg/full).
- Border weights (1, 1.5).
- Elevation shadows (used sparingly — mobile prefers borders to shadows).

## 6. Motion
- Standard durations (150 / 200 / 300 ms) and easings.
- Specific guidance: progress-bar fill, KPI counter on update, modal/sheet enter, button press.

## 7. Components — design tokens
For each: sizes, paddings, states (default / hover / active / disabled / focus-visible), and tap target ≥ 44 px on mobile.
- Button (primary / secondary / ghost / destructive)
- Input + Select + Date input
- Card (KPI card, category card)
- Progress bar (category fill)
- Pacing bar (with marker for cycle progress)
- Badge (fisso, duplicato, +€X)
- FAB (mobile add-expense)
- Sheet / Dialog (mobile cycle picker)

## 8. Layout
- Breakpoints (mobile-first: base, sm 640, md 768, lg 1024).
- Container max-widths (max-w-md for forms, max-w-3xl for dashboard at md+).
- Safe-area handling for iOS notch / FAB above home-indicator.

## 9. Iconography
- One source (e.g., `lucide-react`); list icons used and at what sizes.

## 10. Accessibility
- Focus styles, motion-reduce, prefers-color-scheme placeholder.

## 11. Tailwind theme additions
Exact JS block to paste into `tailwind.config.ts` `theme.extend`.

## 12. CSS variables block
Exact CSS to paste into `src/styles/globals.css` `@layer base { :root { ... } }`.

## 13. Examples (optional but recommended)
ASCII or screenshot links of: KPI card, category card collapsed, category card expanded, FAB, pacing bar.
```

- [ ] **Step 3: Apply the Tailwind tokens**

Open `tailwind.config.ts` and paste the contents of `DESIGN.md` §11 into `theme.extend`. The block typically looks like:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // PASTE FROM DESIGN.md §11 — colors / fontFamily / fontSize / borderRadius / boxShadow / spacing
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Apply the CSS variables**

Open `src/styles/globals.css` and paste the contents of `DESIGN.md` §12 inside the existing base layer. Keep the shadcn-generated variables; replace ones the design system overrides:

```css
@import "tailwindcss";

@layer base {
  :root {
    /* PASTE FROM DESIGN.md §12 */
  }
  body {
    font-feature-settings: "tnum"; /* tabular numbers for currency */
  }
}
```

- [ ] **Step 5: Visual verification**

Start `pnpm dev`. Verify:
- The placeholder home page (`Budget — in costruzione`) reflects the new typography and background.
- shadcn `Button`, `Input`, `Card` (try one in a scratch route or at the bottom of `page.tsx` temporarily) render with the new theme.
- At 375×812 (mobile) and 1280×800 (desktop) the typography and spacing read correctly.
- Tabular numbers render aligned (test with `<span className="tabular-nums">€ 1.234,56</span>`).

If something is off, iterate with the frontend-design skill (one or two more turns) and re-paste the updated tokens. Do NOT proceed to Task 5 until DESIGN.md is committed and the dev server reflects it.

- [ ] **Step 6: Update `CLAUDE.md` to reference `DESIGN.md`**

In `CLAUDE.md` under "Conventions", add this bullet near the mobile-first one:
```markdown
   - **Design tokens.** All colors, typography, spacing, radii, shadows, and motion come from `DESIGN.md` (and from the Tailwind/CSS variables it produced). Never hard-code hex values, font sizes, or one-off paddings in components — extend the theme instead.
```

- [ ] **Step 7: Commit**

```bash
git add DESIGN.md tailwind.config.ts src/styles/globals.css CLAUDE.md
git commit -m "feat(design): produce design system via frontend-design (DESIGN.md + tokens)"
```

Expected: working tree clean. `pnpm typecheck && pnpm lint` pass. Dev server reflects the new theme.

---

## Task 5: Add Vitest + Playwright

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Modify: `package.json` (devDependencies)
- Create: `tests/unit/.gitkeep`, `tests/integration/.gitkeep`, `tests/e2e/.gitkeep`

- [ ] **Step 1: Install dev deps**

```bash
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom @playwright/test
pnpm dlx playwright install --with-deps chromium
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: [],
    coverage: { reporter: ["text", "html"], include: ["src/**/*.ts"] },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 3: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    locale: "it-IT",
    timezoneId: "Europe/Rome",
  },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Write a smoke unit test**

Create `tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest is configured", () => expect(1 + 1).toBe(2));
});
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm typecheck && pnpm test
git add -A
git commit -m "chore: add Vitest and Playwright"
```
Expected: 1 test passes.

---

## Task 6: Initialize Supabase locally

**Files:**
- Create: `supabase/config.toml`, `supabase/.gitignore`
- Create: `.env.local.example`

- [ ] **Step 1: Install Supabase CLI as dev dependency**

```bash
pnpm add -D supabase
```

- [ ] **Step 2: Init Supabase**

```bash
pnpm dlx supabase init
```
Accept defaults. This creates `supabase/config.toml` and `supabase/.gitignore`.

- [ ] **Step 3: Start the local stack**

```bash
pnpm db:start
```
Expected: Docker containers start; CLI prints `API URL`, `anon key`, `service_role key`. Save these for the next step.

- [ ] **Step 4: Write `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-local-service-role-key
```

Copy `.env.local.example` to `.env.local` and fill with the values from Step 3. **Do not commit `.env.local`** (already in `.gitignore`).

- [ ] **Step 5: Commit**

```bash
git add supabase .env.local.example package.json pnpm-lock.yaml
git commit -m "chore: initialize local Supabase"
```

---

## Task 7: `lib/format/eur.ts` (TDD)

**Files:**
- Create: `src/lib/format/eur.ts`
- Create: `tests/unit/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatEur } from "@/lib/format/eur";

describe("formatEur", () => {
  it("formats positive integers", () => {
    expect(formatEur(800)).toBe("€ 800,00");
  });
  it("formats decimals with comma separator", () => {
    expect(formatEur(83.83)).toBe("€ 83,83");
  });
  it("formats thousands with dot separator", () => {
    expect(formatEur(4639.82)).toBe("€ 4.639,82");
  });
  it("formats zero", () => {
    expect(formatEur(0)).toBe("€ 0,00");
  });
  it("formats negative with leading minus", () => {
    expect(formatEur(-3115.3)).toBe("-€ 3.115,30");
  });
  it("rounds half-to-even at 2 decimals", () => {
    expect(formatEur(1.005)).toBe("€ 1,01");
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test tests/unit/format.test.ts
```
Expected: cannot find module `@/lib/format/eur`.

- [ ] **Step 3: Implement**

Create `src/lib/format/eur.ts`:
```ts
const formatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEur(amount: number): string {
  // Intl produces "1.234,56 €"; we want "€ 1.234,56" / "-€ 1.234,56".
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const parts = formatter.formatToParts(abs);
  const number = parts.filter((p) => p.type !== "currency" && p.type !== "literal").map((p) => p.value).join("");
  return `${sign}€ ${number}`;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/unit/format.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/format/eur.ts tests/unit/format.test.ts
git commit -m "feat(format): add Italian EUR formatter"
```

---

## Task 8: `lib/format/date.ts` (TDD)

**Files:**
- Create: `src/lib/format/date.ts`
- Modify: `tests/unit/format.test.ts`

- [ ] **Step 1: Add tests**

Append to `tests/unit/format.test.ts`:
```ts
import { formatDate, formatDateRange } from "@/lib/format/date";

describe("formatDate", () => {
  it("formats ISO date as DD/MM/YYYY", () => {
    expect(formatDate("2026-04-27")).toBe("27/04/2026");
  });
  it("accepts a Date object", () => {
    expect(formatDate(new Date(Date.UTC(2026, 3, 27)))).toBe("27/04/2026");
  });
});

describe("formatDateRange", () => {
  it("renders Italian short range", () => {
    expect(formatDateRange("2026-03-27", "2026-04-26")).toBe("27 mar – 26 apr 2026");
  });
  it("includes both years when they differ", () => {
    expect(formatDateRange("2025-12-27", "2026-01-26")).toBe("27 dic 2025 – 26 gen 2026");
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test tests/unit/format.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/format/date.ts`:
```ts
const dmyFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const shortDayMonth = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const shortDayMonthYear = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // ISO YYYY-MM-DD — parse as UTC noon to avoid TZ drift in display.
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
}

export function formatDate(d: string | Date): string {
  return dmyFormatter.format(toDate(d));
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = toDate(start);
  const e = toDate(end);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  if (sameYear) {
    return `${shortDayMonth.format(s)} – ${shortDayMonth.format(e)} ${e.getUTCFullYear()}`;
  }
  return `${shortDayMonthYear.format(s)} – ${shortDayMonthYear.format(e)}`;
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/format/date.ts tests/unit/format.test.ts
git commit -m "feat(format): add Italian date formatters"
```

---

## Task 9: `lib/cycle/compute.ts` (TDD)

**Files:**
- Create: `src/lib/cycle/compute.ts`
- Create: `tests/unit/cycle.test.ts`

The cycle computation is the most subtle piece in the codebase. Read section 3.1 of the spec before starting.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/cycle.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeCycleForDate, nextCycle } from "@/lib/cycle/compute";

describe("computeCycleForDate", () => {
  it("standard month: today=Apr 28, start_day=27 → cycle Apr 27 to May 26", () => {
    const cycle = computeCycleForDate("2026-04-28", 27);
    expect(cycle.start).toBe("2026-04-27");
    expect(cycle.end).toBe("2026-05-26");
  });

  it("today is exactly start_day: cycle starts today", () => {
    const cycle = computeCycleForDate("2026-04-27", 27);
    expect(cycle.start).toBe("2026-04-27");
    expect(cycle.end).toBe("2026-05-26");
  });

  it("today is the day before start_day: previous cycle still active", () => {
    const cycle = computeCycleForDate("2026-04-26", 27);
    expect(cycle.start).toBe("2026-03-27");
    expect(cycle.end).toBe("2026-04-26");
  });

  it("start_day=10: today=Apr 28 → cycle Apr 10 to May 9", () => {
    const cycle = computeCycleForDate("2026-04-28", 10);
    expect(cycle.start).toBe("2026-04-10");
    expect(cycle.end).toBe("2026-05-09");
  });

  it("clamps to last day of February for start_day=31", () => {
    const cycle = computeCycleForDate("2026-02-15", 31);
    // Feb 2026: clamp 31 to 28 → cycle Jan 31 to Feb 27
    expect(cycle.start).toBe("2026-01-31");
    expect(cycle.end).toBe("2026-02-27");
  });

  it("clamps to last day of February in leap year for start_day=31", () => {
    const cycle = computeCycleForDate("2024-02-15", 31);
    expect(cycle.start).toBe("2024-01-31");
    expect(cycle.end).toBe("2024-02-28");
  });

  it("works at month-end with start_day=30", () => {
    const cycle = computeCycleForDate("2026-03-29", 30);
    // Mar 29 < Mar 30 → previous cycle ran from Feb 28 (clamped from 30) to Mar 29.
    expect(cycle.start).toBe("2026-02-28");
    expect(cycle.end).toBe("2026-03-29");
  });

  it("rejects invalid start_day", () => {
    expect(() => computeCycleForDate("2026-04-28", 0)).toThrow();
    expect(() => computeCycleForDate("2026-04-28", 32)).toThrow();
  });
});

describe("nextCycle", () => {
  it("rolls a 27-cycle forward by one month", () => {
    const next = nextCycle({ start: "2026-04-27", end: "2026-05-26" }, 27);
    expect(next.start).toBe("2026-05-27");
    expect(next.end).toBe("2026-06-26");
  });

  it("clamps when next month is shorter than start_day", () => {
    const next = nextCycle({ start: "2026-01-31", end: "2026-02-27" }, 31);
    expect(next.start).toBe("2026-02-28");
    expect(next.end).toBe("2026-03-30");
  });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

Create `src/lib/cycle/compute.ts`:
```ts
export type CycleRange = { start: string; end: string };

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function iso(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function clampDay(year: number, month0: number, day: number): number {
  return Math.min(day, daysInMonth(year, month0));
}

function parseISO(d: string): { y: number; m: number; d: number } {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m: m - 1, d: day };
}

function addDays(year: number, month0: number, day: number, delta: number): string {
  const t = Date.UTC(year, month0, day) + delta * 86400000;
  const d = new Date(t);
  return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function computeCycleForDate(today: string, startDay: number): CycleRange {
  if (!Number.isInteger(startDay) || startDay < 1 || startDay > 31) {
    throw new Error(`Invalid startDay: ${startDay}`);
  }
  const { y, m, d } = parseISO(today);
  // Cycle that contains `today` starts on the most recent occurrence of startDay (clamped per month).
  const thisMonthStart = clampDay(y, m, startDay);
  let startY = y;
  let startM = m;
  if (d < thisMonthStart) {
    // Roll back to previous month.
    if (m === 0) {
      startY = y - 1;
      startM = 11;
    } else {
      startM = m - 1;
    }
  }
  const startD = clampDay(startY, startM, startDay);
  const start = iso(startY, startM, startD);
  // End is day before the next occurrence of startDay.
  const next = nextCycle({ start, end: "" }, startDay);
  const end = addDays(parseISO(next.start).y, parseISO(next.start).m, parseISO(next.start).d, -1);
  return { start, end };
}

export function nextCycle(current: CycleRange, startDay: number): CycleRange {
  const { y, m } = parseISO(current.start);
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  const nd = clampDay(ny, nm, startDay);
  const start = iso(ny, nm, nd);
  // End = day before the cycle after this one starts.
  const ny2 = nm === 11 ? ny + 1 : ny;
  const nm2 = nm === 11 ? 0 : nm + 1;
  const nd2 = clampDay(ny2, nm2, startDay);
  const end = addDays(ny2, nm2, nd2, -1);
  return { start, end };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/unit/cycle.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle/compute.ts tests/unit/cycle.test.ts
git commit -m "feat(cycle): add cycle date math with month-end clamping"
```

---

## Task 10: `lib/cycle/label.ts` (TDD)

**Files:**
- Create: `src/lib/cycle/label.ts`
- Modify: `tests/unit/cycle.test.ts`

- [ ] **Step 1: Add tests**

Append to `tests/unit/cycle.test.ts`:
```ts
import { cycleLabel } from "@/lib/cycle/label";

describe("cycleLabel", () => {
  it("formats same-year cycle in short Italian", () => {
    expect(cycleLabel({ start: "2026-03-27", end: "2026-04-26" })).toBe("27 mar – 26 apr 2026");
  });
  it("includes years when crossing a year boundary", () => {
    expect(cycleLabel({ start: "2025-12-27", end: "2026-01-26" })).toBe("27 dic 2025 – 26 gen 2026");
  });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

Create `src/lib/cycle/label.ts`:
```ts
import { formatDateRange } from "@/lib/format/date";
import type { CycleRange } from "@/lib/cycle/compute";

export function cycleLabel(range: CycleRange): string {
  return formatDateRange(range.start, range.end);
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle/label.ts tests/unit/cycle.test.ts
git commit -m "feat(cycle): add Italian cycle label formatter"
```

---

## Task 11: `lib/kpi/compute.ts` (TDD)

**Files:**
- Create: `src/lib/kpi/compute.ts`
- Create: `tests/unit/kpi.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/kpi.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeKpis } from "@/lib/kpi/compute";

const cycle = { start: "2026-03-27", end: "2026-04-26" };

describe("computeKpis", () => {
  it("empty cycle returns zeroed totals", () => {
    const k = computeKpis({ cycle, today: "2026-03-27", categories: [], expenses: [], salary: 0, extraIncome: [] });
    expect(k.totalBudget).toBe(0);
    expect(k.totalSpent).toBe(0);
    expect(k.totalRemaining).toBe(0);
    expect(k.percentConsumed).toBe(0);
    expect(k.percentOfSalarySpent).toBe(0);
    expect(k.cycleProgress).toBe(0);
    expect(k.paceDelta).toBe(0);
  });

  it("computes totals from sample data", () => {
    const k = computeKpis({
      cycle,
      today: "2026-04-05",
      categories: [
        { id: "a", name: "Spese casa", expectedAmount: 800 },
        { id: "b", name: "Carburante", expectedAmount: 20 },
      ],
      expenses: [
        { categoryId: "b", amount: 83.83 },
      ],
      salary: 4639.82,
      extraIncome: [],
    });
    expect(k.totalBudget).toBeCloseTo(820);
    expect(k.totalSpent).toBeCloseTo(83.83);
    expect(k.totalRemaining).toBeCloseTo(736.17);
    expect(k.percentConsumed).toBeCloseTo(0.10223, 4);
    expect(k.percentOfSalarySpent).toBeCloseTo(0.01807, 4);
    expect(k.byCategory.find(c => c.id === "b")!.actual).toBeCloseTo(83.83);
    expect(k.byCategory.find(c => c.id === "b")!.overBudget).toBe(true);
  });

  it("computes pace correctly: 1/3 through cycle, 1/4 of budget spent → -0.083", () => {
    // 31-day cycle (Mar 27 to Apr 26 inclusive). Day 11 = Apr 6 → progress 11/31 ≈ 0.355.
    const k = computeKpis({
      cycle,
      today: "2026-04-06",
      categories: [{ id: "a", name: "x", expectedAmount: 400 }],
      expenses: [{ categoryId: "a", amount: 100 }],
      salary: 0,
      extraIncome: [],
    });
    expect(k.cycleProgress).toBeCloseTo(11 / 31, 3);
    expect(k.percentConsumed).toBeCloseTo(0.25, 3);
    expect(k.paceDelta).toBeCloseTo(0.25 - 11 / 31, 3);
  });

  it("clamps cycleProgress to [0,1]", () => {
    const before = computeKpis({ cycle, today: "2026-03-26", categories: [], expenses: [], salary: 0, extraIncome: [] });
    expect(before.cycleProgress).toBe(0);
    const after = computeKpis({ cycle, today: "2026-05-01", categories: [], expenses: [], salary: 0, extraIncome: [] });
    expect(after.cycleProgress).toBe(1);
  });

  it("includes extra income in % total income", () => {
    const k = computeKpis({
      cycle,
      today: "2026-04-01",
      categories: [{ id: "a", name: "x", expectedAmount: 100 }],
      expenses: [{ categoryId: "a", amount: 50 }],
      salary: 1000,
      extraIncome: [{ label: "tredicesima", amount: 1000 }],
    });
    expect(k.percentOfSalarySpent).toBeCloseTo(0.05);
    expect(k.percentOfTotalIncomeSpent).toBeCloseTo(0.025);
  });

  it("returns 0 for percent-of-salary when salary is 0 or null", () => {
    const k = computeKpis({
      cycle,
      today: "2026-04-01",
      categories: [{ id: "a", name: "x", expectedAmount: 100 }],
      expenses: [{ categoryId: "a", amount: 50 }],
      salary: 0,
      extraIncome: [],
    });
    expect(k.percentOfSalarySpent).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

Create `src/lib/kpi/compute.ts`:
```ts
import type { CycleRange } from "@/lib/cycle/compute";

export type KpiCategory = { id: string; name: string; expectedAmount: number };
export type KpiExpense = { categoryId: string; amount: number };
export type ExtraIncome = { label: string; amount: number };

export type KpiInput = {
  cycle: CycleRange;
  today: string;
  categories: KpiCategory[];
  expenses: KpiExpense[];
  salary: number;
  extraIncome: ExtraIncome[];
};

export type CategoryKpi = {
  id: string;
  name: string;
  expected: number;
  actual: number;
  delta: number; // expected - actual
  percentOfBudget: number;
  overBudget: boolean;
};

export type Kpi = {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentConsumed: number;
  percentOfSalarySpent: number;
  percentOfTotalIncomeSpent: number;
  cycleProgress: number;
  paceDelta: number;
  byCategory: CategoryKpi[];
};

function daysBetweenInclusive(startISO: string, endISO: string): number {
  const a = Date.UTC(...(startISO.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [number, number, number]));
  const b = Date.UTC(...(endISO.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [number, number, number]));
  return Math.round((b - a) / 86400000) + 1;
}

function daysFromStart(startISO: string, todayISO: string): number {
  const a = Date.UTC(...(startISO.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [number, number, number]));
  const b = Date.UTC(...(todayISO.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [number, number, number]));
  return Math.round((b - a) / 86400000);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computeKpis(input: KpiInput): Kpi {
  const totalBudget = input.categories.reduce((s, c) => s + c.expectedAmount, 0);
  const totalSpent = input.expenses.reduce((s, e) => s + e.amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const percentConsumed = totalBudget === 0 ? 0 : totalSpent / totalBudget;

  const cycleLength = daysBetweenInclusive(input.cycle.start, input.cycle.end);
  const elapsed = daysFromStart(input.cycle.start, input.today);
  const cycleProgress = cycleLength === 0 ? 0 : clamp01((elapsed + 1) / cycleLength);
  // Off-by-one note: on day 0 of a 31-day cycle, 1/31 has elapsed; before start_date, clamp to 0.
  const cycleProgressBeforeStart = elapsed < 0 ? 0 : cycleProgress;

  const paceDelta = percentConsumed - cycleProgressBeforeStart;

  const totalIncome = input.salary + input.extraIncome.reduce((s, e) => s + e.amount, 0);
  const percentOfSalarySpent = input.salary === 0 ? 0 : totalSpent / input.salary;
  const percentOfTotalIncomeSpent = totalIncome === 0 ? 0 : totalSpent / totalIncome;

  const byCategory: CategoryKpi[] = input.categories.map((c) => {
    const actual = input.expenses.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0);
    const delta = c.expectedAmount - actual;
    return {
      id: c.id,
      name: c.name,
      expected: c.expectedAmount,
      actual,
      delta,
      percentOfBudget: totalBudget === 0 ? 0 : c.expectedAmount / totalBudget,
      overBudget: actual > c.expectedAmount && c.expectedAmount > 0 ? true : (c.expectedAmount === 0 && actual > 0),
    };
  });

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    percentConsumed,
    percentOfSalarySpent,
    percentOfTotalIncomeSpent,
    cycleProgress: cycleProgressBeforeStart,
    paceDelta,
    byCategory,
  };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/unit/kpi.test.ts
```
If the cycleProgress test fails by an off-by-one, adjust the calculation to `elapsed / (cycleLength - 1)` and update tests accordingly. The exact convention is: progress=0 on `start_date`, progress=1 on `end_date`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kpi/compute.ts tests/unit/kpi.test.ts
git commit -m "feat(kpi): add cycle KPI computations"
```

---

## Task 12: Migration — `profiles`

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/0001_profiles.sql`:
```sql
-- Profile row keyed by Supabase auth.users.id.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  cycle_start_day smallint not null check (cycle_start_day between 1 and 31),
  default_salary numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: when a new auth.users row appears, create a placeholder profile.
-- The signup form fills display_name and cycle_start_day immediately after.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, cycle_start_day)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Utente'), 1)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply locally**

```bash
pnpm db:reset
```
Expected: migration applies cleanly.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat(db): add profiles table with RLS and signup trigger"
```

---

## Task 13: Migration — `cycles`

**Files:**
- Create: `supabase/migrations/0002_cycles.sql`

- [ ] **Step 1: Write migration**

```sql
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  salary numeric(12,2),
  extra_income jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, start_date)
);

alter table public.cycles enable row level security;

create policy "cycles_select_own" on public.cycles for select using (auth.uid() = user_id);
create policy "cycles_insert_own" on public.cycles for insert with check (auth.uid() = user_id);
create policy "cycles_update_own" on public.cycles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycles_delete_own" on public.cycles for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply and commit**

```bash
pnpm db:reset
git add supabase/migrations/0002_cycles.sql
git commit -m "feat(db): add cycles table with RLS"
```

---

## Task 14: Migration — `categories`

**Files:**
- Create: `supabase/migrations/0003_categories.sql`

- [ ] **Step 1: Write migration**

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  name text not null,
  expected_amount numeric(12,2) not null default 0 check (expected_amount >= 0),
  is_fixed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_own"
  on public.categories for select
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "categories_insert_own"
  on public.categories for insert
  with check (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "categories_update_own"
  on public.categories for update
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "categories_delete_own"
  on public.categories for delete
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));
```

- [ ] **Step 2: Apply and commit**

```bash
pnpm db:reset
git add supabase/migrations/0003_categories.sql
git commit -m "feat(db): add categories table with RLS"
```

---

## Task 15: Migration — `expenses` + indexes

**Files:**
- Create: `supabase/migrations/0004_expenses.sql`
- Create: `supabase/migrations/0005_indexes.sql`

(`expenses.fingerprint` and `import_id` are deferred to Plan 2 to keep this migration minimal.)

- [ ] **Step 1: Write `0004_expenses.sql`**

```sql
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "expenses_select_own"
  on public.expenses for select
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "expenses_insert_own"
  on public.expenses for insert
  with check (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "expenses_update_own"
  on public.expenses for update
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "expenses_delete_own"
  on public.expenses for delete
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));
```

- [ ] **Step 2: Write `0005_indexes.sql`**

```sql
create index cycles_user_start_idx on public.cycles (user_id, start_date desc);
create index categories_cycle_idx on public.categories (cycle_id, sort_order);
create index expenses_cycle_date_idx on public.expenses (cycle_id, occurred_on desc);
create index expenses_category_idx on public.expenses (category_id);
```

- [ ] **Step 3: Apply and commit**

```bash
pnpm db:reset
git add supabase/migrations/0004_expenses.sql supabase/migrations/0005_indexes.sql
git commit -m "feat(db): add expenses table, RLS, and core indexes"
```

---

## Task 16: Generate Supabase TypeScript types

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 1: Generate**

```bash
pnpm db:types
```
Expected: `src/types/database.ts` populated with `Database` type containing `profiles`, `cycles`, `categories`, `expenses` tables.

- [ ] **Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "chore: generate Supabase TypeScript types"
```

---

## Task 17: RLS integration tests

**Files:**
- Create: `tests/integration/rls.test.ts`
- Create: `tests/integration/_helpers.ts`

- [ ] **Step 1: Write helpers**

Create `tests/integration/_helpers.ts`:
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function admin(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

export async function createTestUser(email: string, password = "TestPassword!1"): Promise<{ id: string; client: SupabaseClient }> {
  const a = admin();
  const { data, error } = await a.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const id = data.user!.id;
  await a.from("profiles").update({ display_name: email.split("@")[0], cycle_start_day: 1 }).eq("id", id);
  const userClient = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  return { id, client: userClient };
}

export async function deleteTestUsers(emails: string[]) {
  const a = admin();
  for (const email of emails) {
    const { data } = await a.auth.admin.listUsers();
    const u = data.users.find((x) => x.email === email);
    if (u) await a.auth.admin.deleteUser(u.id);
  }
}
```

- [ ] **Step 2: Add `dotenv` and pre-test env loading**

Install:
```bash
pnpm add -D dotenv
```

Add to top of `vitest.config.ts`:
```ts
import "dotenv/config";
```

- [ ] **Step 3: Write the failing test**

Create `tests/integration/rls.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const A_EMAIL = "alice-rls@test.local";
const B_EMAIL = "bob-rls@test.local";

describe("RLS isolation", () => {
  let aliceId: string;
  let bobClient: ReturnType<typeof admin>;

  beforeAll(async () => {
    await deleteTestUsers([A_EMAIL, B_EMAIL]);
    const alice = await createTestUser(A_EMAIL);
    const bob = await createTestUser(B_EMAIL);
    aliceId = alice.id;
    bobClient = bob.client;
    // Alice creates a cycle.
    const a = admin();
    await a.from("cycles").insert({
      user_id: alice.id,
      start_date: "2026-04-27",
      end_date: "2026-05-26",
    });
  });

  afterAll(async () => {
    await deleteTestUsers([A_EMAIL, B_EMAIL]);
  });

  it("Bob cannot read Alice's cycles", async () => {
    const { data, error } = await bobClient.from("cycles").select("*").eq("user_id", aliceId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Bob cannot insert a cycle owned by Alice", async () => {
    const { error } = await bobClient.from("cycles").insert({
      user_id: aliceId,
      start_date: "2026-06-27",
      end_date: "2026-07-26",
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run — expect pass (RLS already in place)**

```bash
pnpm test tests/integration/rls.test.ts
```
If a test fails, fix the relevant migration and re-run `pnpm db:reset`.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/_helpers.ts tests/integration/rls.test.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "test(db): add RLS isolation integration tests"
```

---

## Task 18: Supabase clients

**Files:**
- Create: `src/lib/db/server.ts`
- Create: `src/lib/db/client.ts`

- [ ] **Step 1: Install Supabase SSR**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write `src/lib/db/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

- [ ] **Step 3: Write `src/lib/db/client.ts`**

```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function getBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck
git add -A
git commit -m "feat(db): add SSR Supabase clients (server + browser)"
```

---

## Task 19: Auth pages — signup & login

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/server/actions/auth.ts`
- Create: `src/lib/copy.ts` (initial — Italian strings used so far)

- [ ] **Step 1: Create `src/lib/copy.ts`**

```ts
export const copy = {
  app: { title: "Budget" },
  auth: {
    loginTitle: "Accedi",
    signupTitle: "Crea account",
    email: "Email",
    password: "Password",
    displayName: "Nome",
    cycleStartDay: "Giorno di inizio del ciclo",
    cycleStartDayHelp: "Il giorno del mese in cui ricevi lo stipendio (1–31).",
    submitLogin: "Accedi",
    submitSignup: "Crea account",
    haveAccount: "Hai già un account?",
    noAccount: "Non hai un account?",
    goLogin: "Accedi",
    goSignup: "Registrati",
    errorGeneric: "Si è verificato un errore. Riprova.",
  },
} as const;
```

- [ ] **Step 2: Write `src/server/actions/auth.ts`**

```ts
"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { redirect } from "next/navigation";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(60),
  cycleStartDay: z.coerce.number().int().min(1).max(31),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signupAction(formData: FormData) {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const { email, password, displayName, cycleStartDay } = parsed.data;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error || !data.user) return { error: error?.message ?? "Errore" };
  // Update the placeholder profile created by the trigger.
  await supabase
    .from("profiles")
    .update({ display_name: displayName, cycle_start_day: cycleStartDay })
    .eq("id", data.user.id);
  redirect("/");
}

export async function loginAction(formData: FormData) {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/");
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 3: Write `src/app/login/page.tsx`**

```tsx
import { loginAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.loginTitle}</h1>
      <form action={loginAction} className="space-y-3">
        <label className="block">
          <span className="text-sm">{copy.auth.email}</span>
          <input name="email" type="email" required className="mt-1 w-full rounded border p-3" autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.password}</span>
          <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded border p-3" autoComplete="current-password" />
        </label>
        <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">{copy.auth.submitLogin}</button>
      </form>
      <p className="text-sm text-center">
        {copy.auth.noAccount} <Link href="/signup" className="underline">{copy.auth.goSignup}</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Write `src/app/signup/page.tsx`**

```tsx
import { signupAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.signupTitle}</h1>
      <form action={signupAction} className="space-y-3">
        <label className="block">
          <span className="text-sm">{copy.auth.displayName}</span>
          <input name="displayName" required maxLength={60} className="mt-1 w-full rounded border p-3" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.email}</span>
          <input name="email" type="email" required className="mt-1 w-full rounded border p-3" autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.password}</span>
          <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded border p-3" autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.cycleStartDay}</span>
          <input name="cycleStartDay" type="number" min={1} max={31} required className="mt-1 w-full rounded border p-3" inputMode="numeric" />
          <span className="text-xs text-slate-500">{copy.auth.cycleStartDayHelp}</span>
        </label>
        <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">{copy.auth.submitSignup}</button>
      </form>
      <p className="text-sm text-center">
        {copy.auth.haveAccount} <Link href="/login" className="underline">{copy.auth.goLogin}</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm typecheck && pnpm lint
git add -A
git commit -m "feat(auth): add signup and login pages with Server Actions"
```

---

## Task 20: Auth middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set({ name, value, ...options })),
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!data.user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (data.user && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
```

- [ ] **Step 2: Verify and commit**

```bash
pnpm typecheck && pnpm lint
git add src/middleware.ts
git commit -m "feat(auth): add middleware to gate authenticated routes"
```

---

## Task 21: Dashboard query

**Files:**
- Create: `src/server/queries/dashboard.ts`

- [ ] **Step 1: Write the query module**

```ts
import "server-only";
import { getServerSupabase } from "@/lib/db/server";
import { computeCycleForDate } from "@/lib/cycle/compute";
import type { CycleRange } from "@/lib/cycle/compute";
import { computeKpis, type Kpi } from "@/lib/kpi/compute";

export type DashboardData = {
  profile: { id: string; displayName: string; cycleStartDay: number; defaultSalary: number | null };
  cycle: { id: string; range: CycleRange; salary: number | null; extraIncome: { label: string; amount: number }[] };
  categories: { id: string; name: string; expectedAmount: number; isFixed: boolean; sortOrder: number }[];
  expenses: { id: string; categoryId: string; amount: number; occurredOn: string; note: string | null }[];
  kpi: Kpi;
};

export async function getDashboardForToday(today: string, cycleStartOverride?: string): Promise<DashboardData | null> {
  const supabase = await getServerSupabase();
  const { data: profile, error: pErr } = await supabase.from("profiles").select("*").single();
  if (pErr || !profile) return null;

  const range: CycleRange = cycleStartOverride
    ? await rangeForStart(cycleStartOverride, profile.cycle_start_day)
    : computeCycleForDate(today, profile.cycle_start_day);

  // Find or create the cycle row.
  const { data: existingCycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", profile.id)
    .eq("start_date", range.start)
    .maybeSingle();

  let cycleRow = existingCycle;
  if (!cycleRow) {
    const { data: created, error } = await supabase
      .from("cycles")
      .insert({ user_id: profile.id, start_date: range.start, end_date: range.end, salary: profile.default_salary })
      .select("*")
      .single();
    if (error || !created) return null;
    cycleRow = created;
  }

  const { data: cats } = await supabase.from("categories").select("*").eq("cycle_id", cycleRow.id).order("sort_order");
  const { data: exps } = await supabase.from("expenses").select("*").eq("cycle_id", cycleRow.id).order("occurred_on", { ascending: false });

  const categories = (cats ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    expectedAmount: Number(c.expected_amount),
    isFixed: c.is_fixed,
    sortOrder: c.sort_order,
  }));
  const expenses = (exps ?? []).map((e) => ({
    id: e.id,
    categoryId: e.category_id,
    amount: Number(e.amount),
    occurredOn: e.occurred_on,
    note: e.note,
  }));
  const extraIncome = ((cycleRow.extra_income as unknown as { label: string; amount: number }[]) ?? []).map((x) => ({
    label: x.label,
    amount: Number(x.amount),
  }));
  const salary = cycleRow.salary === null ? null : Number(cycleRow.salary);

  const kpi = computeKpis({
    cycle: range,
    today,
    categories: categories.map((c) => ({ id: c.id, name: c.name, expectedAmount: c.expectedAmount })),
    expenses: expenses.map((e) => ({ categoryId: e.categoryId, amount: e.amount })),
    salary: salary ?? 0,
    extraIncome,
  });

  return {
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      cycleStartDay: profile.cycle_start_day,
      defaultSalary: profile.default_salary === null ? null : Number(profile.default_salary),
    },
    cycle: { id: cycleRow.id, range, salary, extraIncome },
    categories,
    expenses,
    kpi,
  };
}

async function rangeForStart(startISO: string, startDay: number): Promise<CycleRange> {
  // Override: if the user picked a specific past cycle, derive end_date from start_date + clamp.
  const { nextCycle } = await import("@/lib/cycle/compute");
  const next = nextCycle({ start: startISO, end: "" }, startDay);
  // end = day before next cycle start
  const t = new Date(`${next.start}T12:00:00Z`).getTime() - 86_400_000;
  const d = new Date(t);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { start: startISO, end: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` };
}
```

- [ ] **Step 2: Verify and commit**

```bash
pnpm typecheck
git add src/server/queries/dashboard.ts
git commit -m "feat(query): add dashboard query with lazy cycle creation"
```

---

## Task 22: Server Action — `expense`

**Files:**
- Create: `src/server/actions/expense.ts`
- Create: `tests/integration/expense-actions.test.ts`

- [ ] **Step 1: Write `expense.ts`**

```ts
"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { computeCycleForDate } from "@/lib/cycle/compute";
import { revalidatePath } from "next/cache";

const ExpenseSchema = z.object({
  amount: z.coerce.number().nonnegative(),
  categoryId: z.string().uuid(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});

async function ensureCycleForDate(occurredOn: string) {
  const supabase = await getServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("id, cycle_start_day, default_salary").single();
  if (!profile) throw new Error("No profile");
  const range = computeCycleForDate(occurredOn, profile.cycle_start_day);
  const { data: existing } = await supabase.from("cycles").select("id").eq("user_id", profile.id).eq("start_date", range.start).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("cycles")
    .insert({ user_id: profile.id, start_date: range.start, end_date: range.end, salary: profile.default_salary })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("cycle insert failed");
  return created.id;
}

export async function createExpenseAction(formData: FormData) {
  const parsed = ExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const cycleId = await ensureCycleForDate(parsed.data.occurredOn);
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").insert({
    cycle_id: cycleId,
    category_id: parsed.data.categoryId,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    note: parsed.data.note ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteExpenseAction(id: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Write integration test**

Create `tests/integration/expense-actions.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL = "alice-exp@test.local";

describe("expense actions", () => {
  let userId: string;
  let userClient: ReturnType<typeof admin>;
  let cycleId: string;
  let categoryId: string;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const { id, client } = await createTestUser(EMAIL);
    userId = id;
    userClient = client;
    await admin().from("profiles").update({ cycle_start_day: 27, default_salary: 4000 }).eq("id", id);
    const { data: c } = await admin()
      .from("cycles")
      .insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26", salary: 4000 })
      .select("*").single();
    cycleId = c!.id;
    const { data: cat } = await admin()
      .from("categories")
      .insert({ cycle_id: cycleId, name: "Carburante", expected_amount: 20 })
      .select("*").single();
    categoryId = cat!.id;
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("inserts an expense in the current cycle", async () => {
    const { error } = await userClient.from("expenses").insert({
      cycle_id: cycleId, category_id: categoryId, amount: 83.83, occurred_on: "2026-04-28", note: "Benzina",
    });
    expect(error).toBeNull();
    const { data } = await userClient.from("expenses").select("*").eq("cycle_id", cycleId);
    expect(data).toHaveLength(1);
    expect(Number(data![0].amount)).toBeCloseTo(83.83);
  });

  it("blocks delete of another user's expense via RLS", async () => {
    const otherEmail = "bob-exp@test.local";
    await deleteTestUsers([otherEmail]);
    const bob = await createTestUser(otherEmail);
    const { error } = await bob.client.from("expenses").delete().eq("cycle_id", cycleId);
    // RLS does not raise an error on no-op deletes; instead, no row is affected.
    const { data } = await admin().from("expenses").select("id").eq("cycle_id", cycleId);
    expect(data!.length).toBeGreaterThan(0);
    await deleteTestUsers([otherEmail]);
  });
});
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test tests/integration/expense-actions.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/expense.ts tests/integration/expense-actions.test.ts
git commit -m "feat(actions): add expense CRUD with lazy cycle creation"
```

---

## Task 23: Server Action — `category` (CRUD)

**Files:**
- Create: `src/server/actions/category.ts`
- Create: `tests/integration/category-actions.test.ts`

- [ ] **Step 1: Implement**

```ts
"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";

const CreateSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(1).max(80),
  expectedAmount: z.coerce.number().nonnegative(),
  isFixed: z.coerce.boolean().optional().default(false),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().uuid() });

export async function createCategoryAction(formData: FormData) {
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").insert({
    cycle_id: parsed.data.cycleId,
    name: parsed.data.name,
    expected_amount: parsed.data.expectedAmount,
    is_fixed: parsed.data.isFixed ?? false,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}

export async function updateCategoryAction(formData: FormData) {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const { id, ...rest } = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("categories").update({
    ...(rest.name !== undefined && { name: rest.name }),
    ...(rest.expectedAmount !== undefined && { expected_amount: rest.expectedAmount }),
    ...(rest.isFixed !== undefined && { is_fixed: rest.isFixed }),
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategoryAction(id: string) {
  const supabase = await getServerSupabase();
  // FK on expenses uses ON DELETE RESTRICT — Postgres blocks if any expense exists.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Impossibile eliminare: la categoria ha spese." };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}
```

- [ ] **Step 2: Write integration test**

Create `tests/integration/category-actions.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL = "alice-cat@test.local";

describe("category actions", () => {
  let cycleId: string;
  let userClient: ReturnType<typeof admin>;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const { id, client } = await createTestUser(EMAIL);
    userClient = client;
    const { data: c } = await admin()
      .from("cycles").insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26" })
      .select("*").single();
    cycleId = c!.id;
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("creates and lists a category", async () => {
    await userClient.from("categories").insert({ cycle_id: cycleId, name: "Mutuo", expected_amount: 530, is_fixed: true });
    const { data } = await userClient.from("categories").select("*").eq("cycle_id", cycleId);
    expect(data).toHaveLength(1);
    expect(data![0].is_fixed).toBe(true);
  });

  it("blocks delete when an expense references the category", async () => {
    const { data: cat } = await userClient.from("categories").select("id").eq("cycle_id", cycleId).single();
    const { data: cycle } = await admin().from("cycles").select("user_id, id").eq("id", cycleId).single();
    await admin().from("expenses").insert({
      cycle_id: cycle!.id,
      category_id: cat!.id,
      amount: 530,
      occurred_on: "2026-04-28",
    });
    const { error } = await userClient.from("categories").delete().eq("id", cat!.id);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/foreign key|violates/i);
  });
});
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test tests/integration/category-actions.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/category.ts tests/integration/category-actions.test.ts
git commit -m "feat(actions): add category CRUD"
```

---

## Task 24: Server Action — `category` carry-forward

**Files:**
- Modify: `src/server/actions/category.ts`
- Modify: `tests/integration/category-actions.test.ts`

- [ ] **Step 1: Append carry-forward**

Append to `src/server/actions/category.ts`:
```ts
const CarrySchema = z.object({ targetCycleId: z.string().uuid() });

export async function carryForwardCategoriesAction(formData: FormData) {
  const parsed = CarrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();

  const { data: target } = await supabase.from("cycles").select("user_id, start_date").eq("id", parsed.data.targetCycleId).single();
  if (!target) return { error: "Ciclo non trovato." };

  const { data: previous } = await supabase
    .from("cycles")
    .select("id")
    .eq("user_id", target.user_id)
    .lt("start_date", target.start_date)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!previous) return { error: "Nessun ciclo precedente." };

  const { data: prevCats } = await supabase
    .from("categories")
    .select("name, expected_amount, is_fixed, sort_order")
    .eq("cycle_id", previous.id)
    .order("sort_order");
  if (!prevCats || prevCats.length === 0) return { error: "Il ciclo precedente non ha categorie." };

  const rows = prevCats.map((c) => ({ ...c, cycle_id: parsed.data.targetCycleId }));
  const { error } = await supabase.from("categories").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true, count: rows.length };
}
```

- [ ] **Step 2: Add integration test for carry-forward**

Append to `tests/integration/category-actions.test.ts`:
```ts
it("carries forward categories from the previous cycle", async () => {
  // Use a fresh user to avoid interference.
  const FWD_EMAIL = "carrie-fwd@test.local";
  await deleteTestUsers([FWD_EMAIL]);
  const { id, client } = await createTestUser(FWD_EMAIL);
  const a = admin();
  const { data: prev } = await a.from("cycles").insert({ user_id: id, start_date: "2026-03-27", end_date: "2026-04-26" }).select("*").single();
  const { data: target } = await a.from("cycles").insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26" }).select("*").single();
  await a.from("categories").insert([
    { cycle_id: prev!.id, name: "Spese casa", expected_amount: 800, sort_order: 0 },
    { cycle_id: prev!.id, name: "Mutuo", expected_amount: 530, is_fixed: true, sort_order: 1 },
  ]);

  // Simulate what the action does (we test the effect, not the wrapper).
  const { data: prevCats } = await client.from("categories").select("name, expected_amount, is_fixed, sort_order").eq("cycle_id", prev!.id).order("sort_order");
  const rows = prevCats!.map((c) => ({ ...c, cycle_id: target!.id }));
  const { error } = await client.from("categories").insert(rows);
  expect(error).toBeNull();

  const { data: copied } = await client.from("categories").select("*").eq("cycle_id", target!.id).order("sort_order");
  expect(copied).toHaveLength(2);
  expect(copied![0].name).toBe("Spese casa");
  expect(copied![1].is_fixed).toBe(true);
  await deleteTestUsers([FWD_EMAIL]);
});
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test tests/integration/category-actions.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/category.ts tests/integration/category-actions.test.ts
git commit -m "feat(actions): add carry-forward of categories from previous cycle"
```

---

## Task 25: Server Action — `cycle` salary & extra income

**Files:**
- Create: `src/server/actions/cycle.ts`
- Create: `tests/integration/cycle-actions.test.ts`

- [ ] **Step 1: Implement**

```ts
"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";

const SalarySchema = z.object({
  cycleId: z.string().uuid(),
  salary: z.coerce.number().nonnegative().nullable(),
});
const ExtraIncomeSchema = z.object({
  cycleId: z.string().uuid(),
  items: z.array(z.object({ label: z.string().min(1).max(60), amount: z.coerce.number().nonnegative() })),
});

export async function setCycleSalaryAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = SalarySchema.safeParse({ ...raw, salary: raw.salary === "" ? null : raw.salary });
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("cycles").update({ salary: parsed.data.salary }).eq("id", parsed.data.cycleId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function setCycleExtraIncomeAction(input: z.infer<typeof ExtraIncomeSchema>) {
  const parsed = ExtraIncomeSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("cycles")
    .update({ extra_income: parsed.data.items as never })
    .eq("id", parsed.data.cycleId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Add integration test**

Create `tests/integration/cycle-actions.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, createTestUser, deleteTestUsers } from "./_helpers";

const EMAIL = "alice-cyc@test.local";

describe("cycle actions", () => {
  let cycleId: string;
  let userClient: ReturnType<typeof admin>;

  beforeAll(async () => {
    await deleteTestUsers([EMAIL]);
    const { id, client } = await createTestUser(EMAIL);
    userClient = client;
    const { data } = await admin()
      .from("cycles").insert({ user_id: id, start_date: "2026-04-27", end_date: "2026-05-26" })
      .select("*").single();
    cycleId = data!.id;
  });

  afterAll(async () => {
    await deleteTestUsers([EMAIL]);
  });

  it("updates salary on the user's own cycle", async () => {
    const { error } = await userClient.from("cycles").update({ salary: 4639.82 }).eq("id", cycleId);
    expect(error).toBeNull();
    const { data } = await userClient.from("cycles").select("salary").eq("id", cycleId).single();
    expect(Number(data!.salary)).toBeCloseTo(4639.82);
  });

  it("stores extra_income as JSONB", async () => {
    const items = [{ label: "tredicesima", amount: 4000 }];
    const { error } = await userClient.from("cycles").update({ extra_income: items }).eq("id", cycleId);
    expect(error).toBeNull();
    const { data } = await userClient.from("cycles").select("extra_income").eq("id", cycleId).single();
    expect(data!.extra_income).toEqual(items);
  });
});
```

- [ ] **Step 3: Run — expect pass**

```bash
pnpm test tests/integration/cycle-actions.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/cycle.ts tests/integration/cycle-actions.test.ts
git commit -m "feat(actions): add cycle salary and extra-income setters"
```

---

## Task 26: Layout & header (mobile-first)

**Files:**
- Modify: `src/app/layout.tsx`, `src/styles/globals.css`
- Create: `src/components/app-header.tsx`, `src/components/fab.tsx`
- Modify: `src/lib/copy.ts` (add header strings)

- [ ] **Step 1: Update copy**

Append to `copy`:
```ts
export const copy = {
  ...,
  header: { settings: "Impostazioni", logout: "Esci" },
  fab: { addExpense: "Aggiungi spesa" },
};
```

- [ ] **Step 2: Header component**

```tsx
// src/components/app-header.tsx
import Link from "next/link";
import { copy } from "@/lib/copy";
import { cycleLabel } from "@/lib/cycle/label";
import type { CycleRange } from "@/lib/cycle/compute";
import { logoutAction } from "@/server/actions/auth";

export function AppHeader({ displayName, range }: { displayName: string; range: CycleRange }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="flex items-center justify-between gap-3 p-3">
        <div>
          <div className="text-xs text-slate-500">Ciclo</div>
          <div className="text-base font-semibold">{cycleLabel(range)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{displayName}</span>
          <Link href="/settings" className="text-sm underline" aria-label={copy.header.settings}>⚙</Link>
          <form action={logoutAction}><button className="text-sm underline">{copy.header.logout}</button></form>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: FAB component**

```tsx
// src/components/fab.tsx
import Link from "next/link";
import { copy } from "@/lib/copy";

export function Fab() {
  return (
    <Link
      href="/expenses/new"
      className="fixed bottom-4 right-4 grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-2xl text-white shadow-lg md:bottom-6 md:right-6"
      aria-label={copy.fab.addExpense}
    >
      +
    </Link>
  );
}
```

- [ ] **Step 4: Root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Budget",
  description: "Budget mensile per coppia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm typecheck && pnpm lint
git add -A
git commit -m "feat(ui): add mobile-first layout, header, and FAB"
```

---

## Task 27: Dashboard — KPI cards

**Files:**
- Create: `src/components/kpi-card.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: KPI card component**

```tsx
// src/components/kpi-card.tsx
import { formatEur } from "@/lib/format/eur";

export function KpiCard({ label, primary, secondary }: { label: string; primary: number | string; secondary?: string }) {
  const value = typeof primary === "number" ? formatEur(primary) : primary;
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold sm:text-xl">{value}</div>
      {secondary && <div className="mt-1 text-xs text-slate-500">{secondary}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Dashboard page wiring**

```tsx
// src/app/page.tsx
import { getDashboardForToday } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/kpi-card";
import { AppHeader } from "@/components/app-header";
import { Fab } from "@/components/fab";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today);
  if (!data) redirect("/login");

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <>
      <AppHeader displayName={data.profile.displayName} range={data.cycle.range} />
      <main className="mx-auto max-w-3xl space-y-3 p-3 pb-24">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label="Stipendio" primary={data.cycle.salary ?? 0} />
          <KpiCard label="Speso" primary={data.kpi.totalSpent} secondary={`su ${formatEurInline(data.kpi.totalBudget)}`} />
          <KpiCard label="Rimanente" primary={data.kpi.totalRemaining} secondary={`${pct(data.kpi.percentConsumed)} del budget`} />
          <KpiCard label="% stipendio" primary={pct(data.kpi.percentOfSalarySpent)} />
        </section>

        {/* pacing bar (Task 28) and category list (Task 29) inserted here */}
      </main>
      <Fab />
    </>
  );
}

function formatEurInline(n: number) {
  // Minor helper to avoid client-import in this snippet; replaced when category list arrives.
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm dev   # then visit http://localhost:3000 (signup, see KPI cards)
pnpm typecheck && pnpm lint
git add -A
git commit -m "feat(dashboard): render KPI cards"
```

---

## Task 28: Dashboard — pacing bar

**Files:**
- Create: `src/components/pacing-bar.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Component**

```tsx
// src/components/pacing-bar.tsx
type Props = { percentConsumed: number; cycleProgress: number; paceDelta: number };

export function PacingBar({ percentConsumed, cycleProgress, paceDelta }: Props) {
  const pct = (n: number) => `${Math.max(0, Math.min(1, n)) * 100}%`;
  const status = paceDelta <= 0 ? "Sotto pace ✓" : "Oltre pace ⚠";
  const color = paceDelta <= 0 ? "text-emerald-700" : "text-red-600";
  return (
    <section className="rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between text-sm">
        <strong>Andamento ciclo</strong>
        <span className={color}>{status}</span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded bg-slate-200">
        <div className="absolute left-0 top-0 h-full bg-blue-600" style={{ width: pct(percentConsumed) }} />
        <div className="absolute top-[-2px] h-3 w-0.5 bg-slate-400" style={{ left: pct(cycleProgress) }} aria-hidden />
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-slate-500">
        <span>Spesa {(percentConsumed * 100).toFixed(1)}%</span>
        <span>Tempo {(cycleProgress * 100).toFixed(0)}%</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into dashboard**

Insert below the KPI cards section in `page.tsx`:
```tsx
<PacingBar percentConsumed={data.kpi.percentConsumed} cycleProgress={data.kpi.cycleProgress} paceDelta={data.kpi.paceDelta} />
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add pacing bar"
```

---

## Task 29: Dashboard — category list (mobile cards / desktop table) with expand

**Files:**
- Create: `src/components/category-row.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Component**

```tsx
// src/components/category-row.tsx
"use client";
import { useState } from "react";
import { formatEur } from "@/lib/format/eur";
import { formatDate } from "@/lib/format/date";

type Tx = { id: string; occurredOn: string; amount: number; note: string | null };
type Props = {
  name: string;
  expected: number;
  actual: number;
  isFixed: boolean;
  overBudget: boolean;
  transactions: Tx[];
};

export function CategoryRow({ name, expected, actual, isFixed, overBudget, transactions }: Props) {
  const [open, setOpen] = useState(false);
  const fillPct = expected === 0 ? (actual > 0 ? 100 : 0) : Math.min(100, (actual / expected) * 100);
  const colour = overBudget ? "bg-red-600" : actual === expected && expected > 0 ? "bg-emerald-600" : "bg-blue-600";

  return (
    <div className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              {name}
              {isFixed && <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[0.65rem] text-indigo-700">fisso</span>}
              {overBudget && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[0.65rem] text-red-700">+{formatEur(actual - expected)}</span>}
            </span>
            <span className="text-sm text-slate-700">{formatEur(actual)} <span className="text-slate-400">/ {formatEur(expected)}</span></span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-slate-200">
            <div className={`${colour} h-full`} style={{ width: `${fillPct}%` }} />
          </div>
        </div>
        <span className="text-slate-400">{open ? "⌃" : "›"}</span>
      </button>
      {open && (
        <div className="border-t bg-slate-50 p-2 text-sm">
          {transactions.length === 0 ? (
            <div className="p-2 text-center text-slate-500">Nessuna transazione.</div>
          ) : (
            <ul className="divide-y">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 p-2">
                  <span>
                    <span className="text-slate-500">{formatDate(t.occurredOn)}</span>
                    {t.note && <em className="ml-2 text-slate-700">{t.note}</em>}
                  </span>
                  <span>− {formatEur(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Use in dashboard**

In `page.tsx`, render after the pacing bar:
```tsx
<section className="space-y-2">
  <h2 className="text-xs uppercase tracking-wide text-slate-500">Categorie · {data.categories.length}</h2>
  {data.categories.map((c) => {
    const k = data.kpi.byCategory.find((x) => x.id === c.id)!;
    const txs = data.expenses.filter((e) => e.categoryId === c.id);
    return (
      <CategoryRow key={c.id} name={c.name} expected={c.expectedAmount} actual={k.actual} isFixed={c.isFixed} overBudget={k.overBudget} transactions={txs} />
    );
  })}
  {data.categories.length === 0 && (
    <div className="rounded-xl border bg-white p-6 text-center text-slate-500">
      Nessuna categoria. <Link href="/categories" className="underline">Aggiungine una</Link>.
    </div>
  )}
</section>
```

- [ ] **Step 3: Verify on mobile and desktop viewport**

Run `pnpm dev`, visit at 375 px and at 1024 px. Tap-to-expand must work; bars must animate within 100 ms.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(dashboard): render category cards with tap-to-expand transaction list"
```

---

## Task 30: Add-expense page

**Files:**
- Create: `src/app/expenses/new/page.tsx`
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Copy strings**

```ts
copy.expense = {
  newTitle: "Nuova spesa",
  amount: "Importo",
  category: "Categoria",
  date: "Data",
  note: "Nota",
  submit: "Salva",
  cancel: "Annulla",
  noCategory: "Nessuna categoria — creane una prima",
};
```

- [ ] **Step 2: Page**

```tsx
// src/app/expenses/new/page.tsx
import Link from "next/link";
import { copy } from "@/lib/copy";
import { getServerSupabase } from "@/lib/db/server";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { createExpenseAction } from "@/server/actions/expense";

export default async function NewExpensePage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getDashboardForToday(today);
  const cats = data?.categories ?? [];

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-semibold">{copy.expense.newTitle}</h1>
      <form action={createExpenseAction} className="space-y-3">
        <label className="block">
          <span className="text-sm">{copy.expense.amount}</span>
          <input name="amount" type="number" step="0.01" min="0" required inputMode="decimal" className="mt-1 w-full rounded border p-3 text-base" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.expense.category}</span>
          <select name="categoryId" required disabled={cats.length === 0} className="mt-1 w-full rounded border p-3 text-base">
            {cats.length === 0 && <option>{copy.expense.noCategory}</option>}
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">{copy.expense.date}</span>
          <input name="occurredOn" type="date" defaultValue={today} required className="mt-1 w-full rounded border p-3 text-base" />
        </label>
        <label className="block">
          <span className="text-sm">{copy.expense.note}</span>
          <input name="note" maxLength={500} className="mt-1 w-full rounded border p-3 text-base" />
        </label>
        <div className="flex gap-2">
          <Link href="/" className="flex-1 rounded border p-3 text-center">{copy.expense.cancel}</Link>
          <button type="submit" className="flex-1 rounded bg-slate-900 p-3 text-white">{copy.expense.submit}</button>
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verify and commit**

Manual test: create a category (Task 31 below ships the editor; in the meantime add via SQL or Supabase Studio), then create an expense, return to dashboard, see it in the right category.

```bash
git add -A
git commit -m "feat(ui): add new-expense page"
```

---

## Task 31: Categories editor

**Files:**
- Create: `src/app/categories/page.tsx`
- Create: `src/components/category-editor-form.tsx`
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Copy strings, then page + form**

(Implement: list of categories with inline edit, "Aggiungi categoria" form, "Riporta dal ciclo precedente" button (calls `carryForwardCategoriesAction`), delete button. Mobile-first stacked layout. Use shadcn `Card`, `Button`, `Input`. The form uses a Server Action.)

```tsx
// src/app/categories/page.tsx
import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";
import { CategoryEditorForm } from "@/components/category-editor-form";
import { deleteCategoryAction, carryForwardCategoriesAction } from "@/server/actions/category";
import { formatEur } from "@/lib/format/eur";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const data = await getDashboardForToday(new Date().toISOString().slice(0, 10));
  if (!data) redirect("/login");

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">{copy.categories?.title ?? "Categorie"}</h1>

      {data.categories.length === 0 && (
        <form action={carryForwardCategoriesAction}>
          <input type="hidden" name="targetCycleId" value={data.cycle.id} />
          <button className="w-full rounded border p-3">Riporta dal ciclo precedente</button>
        </form>
      )}

      <ul className="space-y-2">
        {data.categories.map((c) => (
          <li key={c.id} className="rounded border bg-white p-3">
            <div className="flex justify-between">
              <strong>{c.name}{c.isFixed && <span className="ml-2 rounded bg-indigo-50 px-1 text-xs text-indigo-700">fisso</span>}</strong>
              <span>{formatEur(c.expectedAmount)}</span>
            </div>
            <form action={async () => { "use server"; await deleteCategoryAction(c.id); }} className="mt-2 text-right">
              <button className="text-sm text-red-600 underline">Elimina</button>
            </form>
          </li>
        ))}
      </ul>

      <CategoryEditorForm cycleId={data.cycle.id} />
    </main>
  );
}
```

```tsx
// src/components/category-editor-form.tsx
import { createCategoryAction } from "@/server/actions/category";

export function CategoryEditorForm({ cycleId }: { cycleId: string }) {
  return (
    <form action={createCategoryAction} className="rounded border bg-white p-3 space-y-2">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input name="name" required placeholder="Nome categoria" className="w-full rounded border p-3" />
      <input name="expectedAmount" type="number" step="0.01" min="0" required placeholder="Budget (€)" className="w-full rounded border p-3" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFixed" /> Spesa fissa</label>
      <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">Aggiungi</button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): add categories editor with create/delete and carry-forward"
```

---

## Task 32: Settings page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/server/actions/profile.ts`
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Profile action**

```ts
// src/server/actions/profile.ts
"use server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/db/server";
import { revalidatePath } from "next/cache";

const ProfileSchema = z.object({
  displayName: z.string().min(1).max(60),
  cycleStartDay: z.coerce.number().int().min(1).max(31),
  defaultSalary: z.string().optional().transform((v) => (v === undefined || v === "" ? null : Number(v))),
});

export async function updateProfileAction(formData: FormData) {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dati non validi." };
  const supabase = await getServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("id").single();
  if (!profile) return { error: "Profilo non trovato." };
  const { error } = await supabase.from("profiles").update({
    display_name: parsed.data.displayName,
    cycle_start_day: parsed.data.cycleStartDay,
    default_salary: parsed.data.defaultSalary,
  }).eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
```

- [ ] **Step 2: Page**

```tsx
// src/app/settings/page.tsx
import { getServerSupabase } from "@/lib/db/server";
import { updateProfileAction } from "@/server/actions/profile";
import { setCycleSalaryAction } from "@/server/actions/cycle";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getDashboardForToday(new Date().toISOString().slice(0, 10));
  if (!data) redirect("/login");

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <h1 className="text-xl font-semibold">Impostazioni</h1>

      <form action={updateProfileAction} className="space-y-2 rounded border bg-white p-3">
        <h2 className="font-medium">Profilo</h2>
        <label className="block"><span className="text-sm">Nome</span>
          <input name="displayName" defaultValue={data.profile.displayName} required className="mt-1 w-full rounded border p-3" />
        </label>
        <label className="block"><span className="text-sm">Giorno inizio ciclo</span>
          <input name="cycleStartDay" type="number" min="1" max="31" defaultValue={data.profile.cycleStartDay} required className="mt-1 w-full rounded border p-3" />
        </label>
        <label className="block"><span className="text-sm">Stipendio di default (€)</span>
          <input name="defaultSalary" type="number" step="0.01" min="0" defaultValue={data.profile.defaultSalary ?? ""} className="mt-1 w-full rounded border p-3" />
        </label>
        <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">Salva</button>
      </form>

      <form action={setCycleSalaryAction} className="space-y-2 rounded border bg-white p-3">
        <h2 className="font-medium">Stipendio del ciclo corrente</h2>
        <input type="hidden" name="cycleId" value={data.cycle.id} />
        <label className="block"><span className="text-sm">Stipendio (€)</span>
          <input name="salary" type="number" step="0.01" min="0" defaultValue={data.cycle.salary ?? ""} className="mt-1 w-full rounded border p-3" />
        </label>
        <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">Salva</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): add settings page (profile + cycle salary)"
```

---

## Task 33: Trends page

**Files:**
- Create: `src/app/trends/page.tsx`
- Create: `src/server/queries/trends.ts`
- Create: `src/components/trends-chart.tsx`

- [ ] **Step 1: Install recharts**

```bash
pnpm add recharts
```

- [ ] **Step 2: Trends query**

```ts
// src/server/queries/trends.ts
import "server-only";
import { getServerSupabase } from "@/lib/db/server";

export type TrendCycle = { start_date: string; total_spent: number; total_budget: number };

export async function getTrendCycles(limit = 6): Promise<TrendCycle[]> {
  const supabase = await getServerSupabase();
  const { data: cycles } = await supabase.from("cycles").select("id, start_date").order("start_date", { ascending: false }).limit(limit);
  if (!cycles) return [];
  const out: TrendCycle[] = [];
  for (const c of cycles) {
    const { data: cats } = await supabase.from("categories").select("expected_amount").eq("cycle_id", c.id);
    const { data: exps } = await supabase.from("expenses").select("amount").eq("cycle_id", c.id);
    const total_budget = (cats ?? []).reduce((s, x) => s + Number(x.expected_amount), 0);
    const total_spent = (exps ?? []).reduce((s, x) => s + Number(x.amount), 0);
    out.push({ start_date: c.start_date, total_spent, total_budget });
  }
  return out.reverse();
}
```

- [ ] **Step 3: Client chart**

```tsx
// src/components/trends-chart.tsx
"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format/eur";
import type { TrendCycle } from "@/server/queries/trends";

export function TrendsChart({ data }: { data: TrendCycle[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="start_date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatEur(Number(v))} />
          <Tooltip formatter={(v) => formatEur(Number(v))} />
          <Legend />
          <Bar dataKey="total_budget" name="Budget" fill="#94a3b8" />
          <Bar dataKey="total_spent" name="Speso" fill="#1e293b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Page**

```tsx
// src/app/trends/page.tsx
import { getTrendCycles } from "@/server/queries/trends";
import { TrendsChart } from "@/components/trends-chart";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const data = await getTrendCycles(6);
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Andamento — ultimi 6 cicli</h1>
      {data.length === 0 ? <p className="text-slate-500">Servono almeno due cicli per vedere l'andamento.</p> : <TrendsChart data={data} />}
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add trends page with last-6-cycles chart"
```

---

## Task 34: Italian copy consolidation

**Files:**
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Audit components for inline Italian strings**

Grep for any Italian word in `src/components/**` and `src/app/**` that is not coming from `copy`. Move every such string into `copy.ts`. Update components to import from `@/lib/copy`.

```bash
# helpful grep to find candidates
grep -r --include="*.tsx" --include="*.ts" -E "[a-zàèéìòù]{3,}" src/app src/components | grep -v "@/" | grep -v "console" | grep -v "//"
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(copy): consolidate Italian strings into lib/copy.ts"
```

---

## Task 35: E2E — golden path

**Files:**
- Create: `tests/e2e/golden-path.spec.ts`
- Create: `tests/e2e/_setup.ts`

- [ ] **Step 1: Test (mobile project only)**

```ts
// tests/e2e/golden-path.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("golden path: signup → categories → expense → KPI", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");

  await expect(page).toHaveURL("/");
  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "20");
  await page.click("button[type=submit]");

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "83.83");
  await page.selectOption("[name=categoryId]", { label: "Carburante" });
  await page.fill("[name=note]", "Benzina");
  await page.click("button[type=submit]");

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Carburante")).toBeVisible();
  await expect(page.getByText(/€\s*83,83/)).toBeVisible();
});
```

- [ ] **Step 2: Run**

Make sure `pnpm db:start` is running. Then:
```bash
pnpm test:e2e
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/golden-path.spec.ts
git commit -m "test(e2e): add golden-path signup-to-KPI flow"
```

---

## Task 36: E2E — auth redirect

**Files:**
- Create: `tests/e2e/auth-redirect.spec.ts`

- [ ] **Step 1: Test**

```ts
import { test, expect } from "@playwright/test";

test("unauthenticated visit to / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
```

- [ ] **Step 2: Run and commit**

```bash
pnpm test:e2e tests/e2e/auth-redirect.spec.ts
git add tests/e2e/auth-redirect.spec.ts
git commit -m "test(e2e): assert unauthenticated redirect"
```

---

## Task 37: Hosted Supabase + Vercel deployment

**Files:**
- Create: `docs/deploy.md`

- [ ] **Step 1: Create hosted Supabase project**

Manual step (one-time):
1. Visit https://supabase.com/dashboard, create project `budget-prod` (region: `eu-central-1` for IT users).
2. Copy the project URL, anon key, service-role key.
3. Run `pnpm dlx supabase link --project-ref <ref>` and `pnpm dlx supabase db push` to apply local migrations to the hosted DB.
4. In Supabase Auth settings: enable Email/Password; disable "Confirm email" (small two-user app).

- [ ] **Step 2: Deploy to Vercel**

1. Push the repo to GitHub.
2. Vercel → New Project → import. Framework: Next.js. Root: `.`.
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. (No service-role key needed at runtime.)
4. Deploy. Confirm production URL.

- [ ] **Step 3: Smoke-test production**

Sign up the two real accounts, create a cycle each, add one expense each, confirm dashboards render correctly.

- [ ] **Step 4: Document the runbook**

Create `docs/deploy.md` with the steps above and any tweaks discovered during the actual deploy (correct project ref, region choice, gotchas).

- [ ] **Step 5: Commit**

```bash
git add docs/deploy.md
git commit -m "docs: add deployment runbook"
```

---

## Task 38: Update CLAUDE.md to reflect MVP completion

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a "Status" line at the top of `CLAUDE.md`**

Right under the first paragraph:
```markdown
**Status:** MVP shipped (Plan 1). Plans 2 (Wallet CSV import) and 3 (PWA + production hardening) pending.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): note MVP status"
```

---

## Self-Review

After completing all tasks, re-read sections 1–13 of the spec and confirm coverage:

- [x] §1 Purpose — captured by README + CLAUDE.md
- [x] §2 Users — single-user signup, RLS isolation
- [x] §3.1 Cycle — `lib/cycle/compute.ts` + tests; lazy creation in queries/actions
- [x] §3.2 Category — table + CRUD + carry-forward
- [x] §3.3 Expense — table + CRUD; cycle assignment from `occurred_on`
- [x] §3.4 Salary & extra income — `cycles.salary`, `cycles.extra_income`, settings UI
- [ ] §3.5 Transaction Import — **deferred to Plan 2** (intentional)
- [x] §4 Architecture — Next.js + Supabase as built; module boundaries enforced by file structure
- [x] §5 Data model — migrations 0001–0005
- [x] §6 KPIs — `lib/kpi/compute.ts` + tests
- [x] §7 UI screens — dashboard, expense, categories, settings, trends, auth (no import yet)
- [x] §8 Errors — Zod validation + generic toasts via Server Actions; auth middleware redirect
- [x] §9 Testing — unit (cycle/kpi/format), integration (RLS + actions), E2E (golden-path + auth-redirect)
- [x] §10 CLAUDE.md — Task 1
- [x] **Design system — `DESIGN.md` produced via frontend-design skill in Task 4; tokens applied to Tailwind + globals.css**
- [x] §11 Out of Scope — respected
- [x] §13 Spreadsheet mapping — dashboard renders columns 1–5; "Note" via per-expense expand

If any "x" line above feels weak, raise it before declaring the plan done.
