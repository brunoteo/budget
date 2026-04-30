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
   - **Publishable key** (used by the app at runtime — appears under API Keys as `sb_publishable_*`).
   - **service_role key** (used by the CLI to push migrations; do NOT ship to the browser).
3. Open **Project Settings → Auth → Email** and:
   - Enable **Email + Password**.
   - Disable **Confirm email** (single-couple app — emails are trusted).
   - Disable **"Allow new users to sign up"** (Authentication → Providers → Email). Both production accounts already exist; turning this off prevents the Supabase API from accepting any new signups even if the env-var guard is misconfigured.
4. Open **Project Settings → Auth → URL Configuration** and set:
   - **Site URL:** the Vercel production URL (e.g. `https://budget.vercel.app`). Set this *after* the first Vercel deploy in §3 — come back here to fill it in.
   - **Additional Redirect URLs:** one entry per line:
     - `http://localhost:3000/**` (local dev)
     - `https://*-brunoteo.vercel.app/**` (Vercel preview deploys — replace `brunoteo` with your Vercel team slug)
     - the production URL again as `https://budget.vercel.app/**` if your team slug differs
   - These are the only URLs Supabase will accept as redirect targets after a magic-link / password-recovery click. Wrong list = recovery emails dead-end on a Supabase error page.

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
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the **publishable key** from Project Settings → API → API Keys (the `sb_publishable_*` value, not the legacy JWT).
   - `NEXT_PUBLIC_ALLOW_SIGNUP` = `false` (production) — disables `/signup` route, link, and Server Action. Set this **before** the first deploy. Local `.env.local` should set this to `true` so dev seeding and E2E tests still work.

> **Do NOT set `SUPABASE_SERVICE_ROLE_KEY` in Vercel.** It is local-tests-only (used by `tests/integration/_helpers.ts` to bypass RLS during test setup). Production code does not read it. Adding it to Vercel widens the attack surface for no benefit.

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
- **Rotating the publishable key:** Supabase rotates server-side; update `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy. The same rotation flow applies to the legacy anon JWT if a Supabase migration ever forces a return to it.
- **Logs:** Vercel functions logs surface server-action errors. Supabase logs are in **Project Settings → Logs**.

## Troubleshooting

- **Auth callback fails on production:** confirm the production URL is allowed in **Project Settings → Auth → URL Configuration** (set up in §1 step 4).
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
