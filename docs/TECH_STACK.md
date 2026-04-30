# Tech Stack

A two-user personal-budget web application. Mobile-first, Italian-only UI, paycheck-aligned monthly cycles.

## Runtime & language

| Tool          | Version     | Notes                                                     |
|---------------|-------------|-----------------------------------------------------------|
| Node.js       | 20+         |                                                           |
| pnpm          | —           | Package manager                                           |
| TypeScript    | ^5          | `strict`, `noUncheckedIndexedAccess: true`                |

## Framework & UI

| Package                  | Version  | Role                                                |
|--------------------------|----------|-----------------------------------------------------|
| `next`                   | 16.2.4   | App Router, Server Components, Server Actions       |
| `react` / `react-dom`    | 19.2.4   |                                                     |
| `tailwindcss`            | ^4       | v4 — no `tailwind.config.ts`, theme via `@theme`    |
| `@tailwindcss/postcss`   | ^4       | PostCSS plugin                                      |
| `tw-animate-css`         | ^1.4.0   | Animation utilities                                 |
| `shadcn`                 | ^4.5.0   | Added via CLI; do not fork by hand                  |
| `@base-ui/react`         | ^1.4.1   | Headless UI primitives                              |
| `@radix-ui/react-slot`   | ^1.2.4   | Used by shadcn primitives                           |
| `lucide-react`           | ^1.11.0  | Icon set                                            |
| `class-variance-authority` | ^0.7.1 | Variant API for components                          |
| `clsx`                   | ^2.1.1   | Class composition                                   |
| `tailwind-merge`         | ^3.5.0   | Tailwind class de-duplication                       |

## Data layer

| Package                  | Version   | Role                                                 |
|--------------------------|-----------|------------------------------------------------------|
| `@supabase/supabase-js`  | ^2.105.1  | Postgres + Auth client                               |
| `@supabase/ssr`          | ^0.10.2   | Request-scoped server client                         |
| `supabase` (CLI)         | ^2.95.5   | Local Postgres + Studio, migrations, type generation |
| `server-only`            | ^0.0.1    | Guards server-only modules                           |

Row-Level Security policies are co-located with every migration in `supabase/migrations/`. The service-role key is never used from app code.

## Forms, validation, charts

| Package                | Version   | Role                            |
|------------------------|-----------|---------------------------------|
| `zod`                  | ^4.3.6    | Schema validation               |
| `react-hook-form`      | ^7.74.0   | Form state                      |
| `@hookform/resolvers`  | ^5.2.2    | Zod ↔ react-hook-form bridge    |
| `recharts`             | ^3.8.1    | Charts                          |

## Testing

| Package                       | Version   | Role                             |
|-------------------------------|-----------|----------------------------------|
| `vitest`                      | ^4.1.5    | Unit + integration runner        |
| `@vitest/coverage-v8`         | ^4.1.5    | Coverage                         |
| `@testing-library/react`      | ^16.3.2   | Component testing                |
| `@testing-library/jest-dom`   | ^6.9.1    | DOM matchers                     |
| `jsdom`                       | ^29.1.0   | DOM environment for Vitest       |
| `@playwright/test`            | ^1.59.1   | E2E                              |
| `dotenv`                      | ^17.4.2   | Test env loading                 |

Integration tests run against the local Supabase CLI — Supabase is **not mocked**.

## Tooling

| Package               | Version   | Role                |
|-----------------------|-----------|---------------------|
| `eslint`              | ^9        | Linter              |
| `eslint-config-next`  | 16.2.4    | Next.js ESLint config |

Planned (not yet installed): `papaparse` for the Wallet CSV import (Plan 2).

## Hosting

- **Vercel** — Next.js hosting (free tier)
- **Supabase** — Postgres + Auth (free tier)

## Scripts

| Command           | Purpose                                                  |
|-------------------|----------------------------------------------------------|
| `pnpm dev`        | Next.js dev server (Turbopack)                           |
| `pnpm build`      | Production build                                         |
| `pnpm start`      | Serve production build                                   |
| `pnpm lint`       | ESLint                                                   |
| `pnpm typecheck`  | `tsc --noEmit`                                           |
| `pnpm test`       | Vitest unit + integration                                |
| `pnpm test:watch` | Vitest watch mode                                        |
| `pnpm test:e2e`   | Playwright E2E                                           |
| `pnpm db:start`   | `supabase start` — local Postgres + Studio              |
| `pnpm db:stop`    | `supabase stop`                                          |
| `pnpm db:reset`   | Reset local DB and re-run all migrations                 |
| `pnpm db:diff`    | Generate migration from local schema diff                |
| `pnpm db:types`   | Regenerate `src/types/database.ts`                       |
