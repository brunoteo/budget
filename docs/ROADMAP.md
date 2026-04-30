# Budget — Roadmap

The app ships in three numbered plans. Each plan is a self-contained slice that leaves the product usable; later plans add capability without re-doing earlier work. The full design contract is in [`docs/superpowers/specs/2026-04-28-budget-app-design.md`](superpowers/specs/2026-04-28-budget-app-design.md). Per-plan implementation breakdowns live in [`docs/superpowers/plans/`](superpowers/plans/).

| Plan | Status | Theme | Plan file |
|------|--------|-------|-----------|
| 1 | ✅ Shipped | MVP — manual entry, dashboard, KPIs | [`2026-04-28-budget-mvp.md`](superpowers/plans/2026-04-28-budget-mvp.md) |
| 2 | ✅ Shipped | Wallet CSV import flow | [`2026-04-29-wallet-csv-import.md`](superpowers/plans/2026-04-29-wallet-csv-import.md) |
| 3 | ✅ Shipped | PWA shell + production hardening | [`2026-04-30-budget-pwa-hardening.md`](superpowers/plans/2026-04-30-budget-pwa-hardening.md) |
| 4 | ✅ Shipped | Supabase production hardening (publishable-key rename + deploy runbook) | [`2026-04-30-supabase-prod-hardening.md`](superpowers/plans/2026-04-30-supabase-prod-hardening.md) |

---

## Plan 1 — MVP (shipped 2026-04-28)

**Goal:** A working two-user budget app deployable on Vercel + Supabase free tiers, replacing a manual Google Sheet. Italian-only UI, mobile-first, paycheck-aligned monthly cycles.

**Delivered:**
- Next.js 16 App Router on TypeScript strict; Tailwind v4 + shadcn (base-nova).
- Supabase Postgres with RLS isolation per user; Auth (email + password).
- Pure libraries (`lib/cycle`, `lib/kpi`, `lib/format`) with unit tests.
- Server Actions for expense / category / cycle / profile mutations, all Zod-validated.
- Dashboard with: 4 KPI cards (stipendio, speso, rimanente, % stipendio), pacing bar (`In linea` / `Fuori ritmo`), category list with tap-to-expand transactions.
- Pages: `/`, `/login`, `/signup`, `/expenses/new`, `/categories`, `/settings`, `/trends` (last-6-cycles bar chart).
- DESIGN.md design system (Terracotta + clay, DM fonts).
- 38 unit/integration tests (incl. RLS isolation) + 4 Playwright E2E tests.
- Deployment runbook in [`docs/deploy.md`](deploy.md).

**Spec coverage:** §1, §2, §3.1–§3.4, §4, §5, §6, §7 (less import), §8, §9, §10, §11, §13. Section §3.5 (import) deferred to Plan 2.

---

## Plan 2 — Wallet CSV import (next)

**Goal:** Users can bulk-import past transactions from Wallet by BudgetBakers (and any other CSV via column mapping), with a review-first staging step that never creates expenses without explicit confirm.

**Why this is plan 2:** spec §3.5. The MVP only supports manual entry; backfilling a year's worth of expenses one-by-one is impractical. Import unlocks the "switch from Google Sheet today" use case.

**Scope:**
- `/import` page: drag-and-drop CSV upload, browser-side `papaparse`, Italian-locale parsing (semicolon delimiter, `1.234,56` decimals, `YYYY-MM-DD HH:MM:SS` dates).
- Default Wallet column mapping seeded on signup; new mappings saved per file-header hash so the same source format skips the mapping step next time.
- Filtering: rows with `type = Entrate` or `transfer = true` are skipped and counted.
- Suggested categorization via `category_rules` (priority-ordered substring matches on the concatenation of Wallet category + payee + note). Rule UI in `/settings`.
- Staging table: per-row category dropdown, "applica anche alle prossime" learn-rule checkbox, include/exclude toggle, "creerà ciclo …" hint when a row falls outside an existing cycle.
- Duplicate detection: SHA-256 fingerprint of `(occurred_on, amount, lower(note))` against existing expenses and within-batch rows. Duplicates pre-unchecked.
- Commit: bulk insert with shared `import_id`; lazy-creates missing cycles and categories.
- Undo: single-click "Annulla importazione" within 24 hours via `import_id`.
- `/import/history` page listing past imports with filenames, counts, undo buttons.
- Initial rule seeding flow on first import — match app-side category names against Wallet's vocabulary using lowercase + accent-strip + substring; user reviews seed list before any rule is created.

**Out of scope for Plan 2:**
- XLS / PDF import (CSV only).
- Bank-API connections or scheduled imports.
- Income import (income still lives only on `cycles.salary` + `extra_income`).
- Multi-account separation (Wallet `account` column ignored — all expenses merge into the user's app cycles).
- Regex rules — substring patterns only.

**Schema additions (anticipated):**
- `imports` table: `id`, `user_id`, `filename`, `committed_at`, `row_counts (jsonb)`, `import_source`.
- `import_mappings` table: `id`, `user_id`, `header_hash`, `mapping (jsonb)`, `is_default`.
- `category_rules` table: `id`, `user_id`, `pattern`, `category_name`, `priority`.
- `expenses.fingerprint text` + `expenses.import_id uuid` (nullable FK to `imports`).
- New indexes for fingerprint lookups.

---

## Plan 3 — PWA + production hardening (shipped 2026-04-30)

**Goal:** Make the app feel like an installed mobile app on Android and tighten operational corners so it can run unattended; surface form errors inline; harden security headers.

**Delivered:**
- Phase 1: env-gated `/signup` lockdown via three independent guards (middleware proxy, page-level check, server action check) — no new registrations without `ALLOW_SIGNUP=true`.
- Phase 2: per-request CSP nonce injected via middleware + four supporting security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`); Dependabot postcss override.
- Phase 3: unified `ActionResult` contract across 6 Server Actions; inline form errors via `useActionState`; sonner toasts for post-redirect success confirmations.
- Phase 4: Android PWA shell — web manifest, brand-matched icon set generated from OKLCH tokens, no-op service worker with production-only registration, viewport metadata (`theme-color`, `viewport-fit=cover`), deploy install steps documented.
- Phase 5: focus-visible ring (2 px terra-500) with clay-50 contrast override on terra-500 backgrounds; `prefers-reduced-motion` rule tightened to include `scroll-behavior: auto`; focus-ring and reduced-motion E2E coverage (4 new Playwright tests); 44×44 px tap-target fixes on category delete button and Sheet/Dialog close buttons.

iOS PWA support, dark mode toggle, and design-system token-only CSS migration are out of scope for Plan 3.

---

## Plan 3 — PWA + production hardening (original scope notes)

**Goal:** Make the app feel like an installed mobile app and tighten the operational corners so it can run unattended.

**Scope:**
- **PWA shell:** web manifest, icons, service worker for "Add to Home Screen" on iOS + Android. Online-only (no offline write queue in v1; the spec defers offline to a later iteration).
- **Push notifications (optional, behind feature flag):** monthly cycle-rollover reminder, mid-cycle pacing alert when `paceDelta` exceeds a threshold.
- **Error UX polish:** toast component for Server Action errors, replacing the current silent failures on form actions; useActionState wiring on auth pages so bad-password attempts surface a message.
- **Auth confirmation flow:** turn on email confirmation in Supabase Auth and add the `/auth/callback` handler.
- **Observability:** Vercel logs already capture server-action errors; add Supabase log-based alerting for RLS violations and migration failures.
- **Backups:** Supabase point-in-time-recovery is on free tier with 1-day retention — document the upgrade path if data starts mattering.
- **Performance:** audit cold-start of the dashboard; add ISR or selective caching where the query is expensive.
- **Accessibility audit:** focus-visible everywhere, prefers-reduced-motion respected, color-contrast spot-check on the OKLCH tokens at AA / AAA.
- **Security review:** rate-limit Server Actions, CSP headers, dependency audit, the open Dependabot alert.
- **Test coverage:** raise integration coverage on profile + cycle actions; visual regression for the dashboard at mobile + desktop breakpoints.

**Decision points before Plan 3 starts:**
- Do we want native push, or is in-app-only enough? (Native push adds APNs/FCM complexity; web-push works on Chromium and now iOS Safari but not on iOS PWA in all states.)
- Does the app need an admin dashboard for the two of you to spot data drift, or is Supabase Studio enough?

---

## Plan 4 — Supabase production hardening (shipped 2026-04-30)

**Goal:** Cut over the public Supabase env var from the legacy anon-JWT name to the new `sb_publishable_*` name Supabase ships in fresh projects, and tighten `docs/deploy.md` so the production wiring runbook leaves no dashboard step undocumented.

**Delivered:**
- Phase 1: `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` across server, browser, and middleware Supabase clients plus the integration-test helper and `.env.local.example`. No behavior change; the JWT value Supabase emits is unchanged.
- Phase 2: `docs/deploy.md` Auth → URL Configuration promoted to a numbered step; publishable-key naming through the runbook; explicit "do NOT set service-role key in Vercel" callout.

No new tables, no new server actions, no UI change. All existing tests still pass unchanged.

---

## Out of scope across all plans

The spec (§11) explicitly excludes:
- Joint-household / shared budgets, multi-currency, English copy.
- Receipt photo capture or OCR.
- Investment / savings goals tracking.
- Bank API integrations.
- Native mobile app (PWA only).
- Regex-based import rules.

These could be future plans but are not implied promises — each requires fresh design.
