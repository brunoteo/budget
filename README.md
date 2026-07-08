# Budget

A personal-budget web app for people with separate paychecks and pay cycles that don't align with the calendar month. Built to replace a manual Google Sheet.

Each user gets an isolated account with their own data and their own pay-cycle (e.g. 27th-to-26th, 10th-to-9th). Cycles align to paycheck day, not the 1st of the month — the app's core differentiator. Italian-only UI, mobile-first (built for Android).

## Features

- **Paycheck-aligned cycles** — each user sets their own cycle start day; cycles are created lazily as expenses land in them.
- **Dashboard** — KPI cards (stipendio, speso, rimanente, % stipendio), pacing indicator (in linea / fuori ritmo), end-of-cycle spending forecast.
- **Categories & expenses** — manual entry, per-category expected budgets, edit/delete with cycle re-derivation.
- **Wallet CSV import** — bulk-import past transactions from [Wallet by BudgetBakers](https://budgetbakers.com/) (or any CSV via column mapping), with duplicate detection, category-rule suggestions, and a review-before-commit staging step.
- **Trends** — top movers, per-category sparklines, year-over-year rollup, % stipendio speso history.
- **Search** — cross-cycle transaction search by text, date, amount, or category.
- **PWA** — installable on Android home screen.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full shipped-plan history and [`docs/superpowers/specs/`](docs/superpowers/specs/) for design specs.

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript strict
- **Tailwind CSS v4** + **shadcn/ui** (Base UI)
- **Supabase** — Postgres + Auth + Row-Level Security
- **Recharts**, **papaparse** (CSV import), **Zod** + **react-hook-form**
- **Vitest** (unit + integration), **Playwright** (E2E)
- Hosted on Vercel + Supabase free tiers

## Quick start

```bash
pnpm install
pnpm db:start         # local Supabase via Docker
cp .env.local.example .env.local   # fill in local keys printed by db:start
pnpm dev
```

Optionally seed sample data for local development:

```bash
pnpm db:seed          # creates test@test.com / password with 14 cycles of sample data
```

## Commands

| Command           | What it does                                   |
|--------------------|-------------------------------------------------|
| `pnpm dev`         | Run Next.js dev server                           |
| `pnpm build`       | Production build                                 |
| `pnpm lint`        | ESLint                                           |
| `pnpm typecheck`   | `tsc --noEmit`                                   |
| `pnpm test`        | Vitest unit + integration                        |
| `pnpm test:e2e`    | Playwright E2E                                   |
| `pnpm db:start`    | `supabase start` — local Postgres + Studio       |
| `pnpm db:reset`    | Reset local DB and re-run all migrations         |
| `pnpm db:types`    | Regenerate `src/types/database.ts` from local DB |
| `pnpm db:backup`   | Dump the linked production Supabase project      |

## Deploying

See [`docs/deploy.md`](docs/deploy.md) for the full Supabase + Vercel production runbook.

## Project structure

See [`CLAUDE.md`](CLAUDE.md) for repository layout, conventions, and data-model invariants.

## Scope

Each account is isolated by RLS — no schema limit on user count, but signup is gated behind `NEXT_PUBLIC_ALLOW_SIGNUP` and accounts are created manually. No joint-household features, no multi-currency, no bank-API integrations, no native mobile app. See [`docs/ROADMAP.md`](docs/ROADMAP.md#out-of-scope-across-all-plans) for the full out-of-scope list.

## License

Personal project, source-available for reference. No license granted for reuse.
