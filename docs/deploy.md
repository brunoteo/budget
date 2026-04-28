# Deployment runbook

This document describes how to take the Budget app from local development to production on Supabase + Vercel free tiers.

## Prerequisites

- A Supabase account (https://supabase.com).
- A Vercel account (https://vercel.com).
- A GitHub account with this repo pushed up.
- The Supabase CLI installed (already a dev dependency: `pnpm exec supabase ...`).

## 1. Create the hosted Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
   - **Name:** `budget-prod` (or whatever you prefer).
   - **Region:** `eu-central-1` (Frankfurt) for users in Italy.
   - **Database password:** generate and store in your password manager.
2. Once provisioned, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`).
   - **anon public key** (used by the app at runtime).
   - **service_role key** (used by the CLI to push migrations; do NOT ship to the browser).
3. Open **Project Settings → Auth → Email** and:
   - Enable **Email + Password**.
   - Disable **Confirm email** (single-couple app — emails are trusted).

## 2. Push the schema to the hosted DB

From the project root, run:

```bash
pnpm exec supabase login          # one-time
pnpm exec supabase link --project-ref <your-project-ref>
pnpm exec supabase db push
```

`db push` applies every migration in `supabase/migrations/` in order. Confirm in the Supabase Studio (Tables) that `profiles`, `cycles`, `categories`, `expenses` exist with RLS enabled.

## 3. Deploy to Vercel

1. Push the repo to GitHub (a new repo if it isn't there yet).
2. In Vercel dashboard: **New Project → Import Git Repository**.
   - Framework preset: **Next.js**.
   - Root directory: project root.
3. Add **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key.
   - `SUPABASE_SERVICE_ROLE_KEY` is **not needed at runtime** — leave it out.
4. Click **Deploy**. Wait for the first build to finish (~2 min).
5. Copy the production URL.

## 4. Smoke-test production

1. Open the production URL — you should land on `/login`.
2. Click **Registrati** and sign up the first real account. Confirm the redirect to `/`.
3. Add a category, then an expense. Confirm the dashboard shows the KPI cards and the category list with the expense.
4. Sign out and sign in again with the same credentials.
5. Repeat for the second account from a fresh browser/incognito session.

## 5. Day-2 operations

- **New migrations:** add a file under `supabase/migrations/`, commit, then run `pnpm exec supabase db push` from a machine linked to the project.
- **Regenerating types after schema change:** locally, run `pnpm db:reset && pnpm db:types`, commit the regenerated `src/types/database.ts`.
- **Rotating the anon key:** Supabase rotates server-side; update the Vercel env var and redeploy.
- **Logs:** Vercel functions logs surface server-action errors. Supabase logs are in **Project Settings → Logs**.

## Troubleshooting

- **Auth callback fails on production:** confirm the production URL is allowed in **Project Settings → Auth → URL Configuration**.
- **`db push` complains about a migration mismatch:** the local migrations diverged from what's on the hosted DB. Inspect with `pnpm exec supabase db diff` and resolve manually.
- **RLS blocking unexpected queries:** check that the user is logged in (cookies present). Server queries get the user's auth context via `cookies()`. Service-role bypasses RLS — never use it from app code.
