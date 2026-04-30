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
   - Disable **"Allow new users to sign up"** (Authentication → Providers → Email). Both production accounts already exist; turning this off prevents the Supabase API from accepting any new signups even if the env-var guard is misconfigured.

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
   - `NEXT_PUBLIC_ALLOW_SIGNUP` = `false` (production) — disables `/signup` route, link, and Server Action. Set this **before** the first deploy. Local `.env.local` should set this to `true` so dev seeding and E2E tests still work.
   - `SUPABASE_SERVICE_ROLE_KEY` is **not needed at runtime** — leave it out.
4. Click **Deploy**. Wait for the first build to finish (~2 min).
5. Copy the production URL.

## 4. Smoke-test production

1. Open the production URL — you should land on `/login`.
2. Sign in with one of the production accounts (signup is disabled in production — see §1 step 3 and §3 step 3; account creation is a manual operation in Supabase Studio, see §7). Confirm the redirect to `/`.
3. Add a category, then an expense. Confirm the dashboard shows the KPI cards and the category list with the expense.
4. Sign out and sign in again with the same credentials.
5. Repeat for the second account from a fresh browser/incognito session.

## 5. Installing the PWA on Android

After the first deploy that includes the manifest:

1. Open the production URL in **Chrome on Android**.
2. Tap the address bar's "**Installa**" badge if Chrome surfaces one, OR open the triple-dot menu → **Installa l'app**.
3. The app appears on the home screen with the "Budget" name and the terracotta "B" icon.
4. Launching the icon opens the app in standalone mode (no Chrome chrome).

Repeat for both spouses. iOS is not supported in this version.

## 6. Day-2 operations

- **New migrations:** add a file under `supabase/migrations/`, commit, then run `pnpm exec supabase db push` from a machine linked to the project.
- **Regenerating types after schema change:** locally, run `pnpm db:reset && pnpm db:types`, commit the regenerated `src/types/database.ts`.
- **Rotating the anon key:** Supabase rotates server-side; update the Vercel env var and redeploy.
- **Logs:** Vercel functions logs surface server-action errors. Supabase logs are in **Project Settings → Logs**.

## Troubleshooting

- **Auth callback fails on production:** confirm the production URL is allowed in **Project Settings → Auth → URL Configuration**.
- **`db push` complains about a migration mismatch:** the local migrations diverged from what's on the hosted DB. Inspect with `pnpm exec supabase db diff` and resolve manually.
- **RLS blocking unexpected queries:** check that the user is logged in (cookies present). Server queries get the user's auth context via `cookies()`. Service-role bypasses RLS — never use it from app code.

## 7. Recovering an account

If either user forgets their password:

1. Open Supabase Studio for the production project → **Authentication → Users**.
2. Find the user row, click the kebab menu → **Send password recovery**.
3. The user receives a reset link by email and follows the standard Supabase reset flow (no in-app handler — Supabase hosts the form).

If the user's email itself has changed: edit it in the same Users panel, then send recovery to the new address.

## 8. Backups

Supabase free tier ships with 1-day point-in-time recovery, automatic. If/when our data starts mattering, upgrade to **Pro** (US$25/mo per project) for 7-day PITR. No app-side backup runbook for now — the database is the source of truth and Supabase manages the snapshot.
