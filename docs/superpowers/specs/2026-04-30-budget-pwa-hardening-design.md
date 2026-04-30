# Plan 3 — PWA Shell + Production Hardening Design

**Status:** Draft (brainstormed 2026-04-30)
**Roadmap link:** [`docs/ROADMAP.md`](../../ROADMAP.md) §Plan 3
**Supersedes:** the Plan-3 outline in `ROADMAP.md` for any conflicts (this document is the source of truth).

---

## 1. Goal

Make the budget app feel like an installed mobile app on both spouses' phones, give every Server Action either an inline error or a toast (no more silent failures), and lock down the surface area to what a two-user couple's app actually needs. No new functionality — this plan is about *trust* and *polish* for daily use.

The app already runs in production (`feat/wallet-csv-import` merged on 2026-04-29). Both real accounts already exist on the hosted Supabase project. From this plan onwards, **production never opens new accounts**.

## 2. Non-goals

This plan is the deliberate *small* version of the Plan-3 bag-of-things in `ROADMAP.md`. The following originally-listed items are explicitly **dropped**:

- **Push notifications** (cycle-rollover reminder, mid-cycle pacing alert). Two people checking the app daily don't need push. Web-push on iOS PWA is unreliable in Safari standalone mode anyway. YAGNI.
- **Email confirmation flow + `/auth/callback` route.** Email confirmation is and stays OFF in Supabase Auth (single-couple app, emails trusted). Without confirmation there is no callback to handle.
- **In-app password recovery flow.** No `/auth/forgot-password` or `/auth/update-password`. If either spouse forgets their password, recovery is manual via Supabase Studio (Auth → Users → "Send password recovery"). One sentence in `docs/deploy.md` documents this.
- **Supabase log alerting** for RLS violations and migration failures. Vercel + Supabase logs are read on demand. No alert pipeline.
- **Dedicated backups runbook section.** A single sentence in `docs/deploy.md` points at Supabase's free-tier 1-day PITR and the upgrade path.
- **Performance audit / ISR / selective caching.** Two-user load. Defer until a slowdown is observed.
- **Visual-regression tests** for the dashboard. Both users use the app daily on real phones; regressions are noticed within hours. Existing unit + integration + Playwright coverage stays the bar.
- **Formal AA/AAA contrast audit with tooling.** OKLCH tokens already pass AA on visual inspection; spot-check during the accessibility quick-wins pass and call it done.
- **Rate-limiting Server Actions in app code.** Supabase Auth handles login throttling natively; signup is gated off in production (see §3); the other actions are logged-in only behind RLS. No in-app rate-limit middleware.

If any of the above becomes load-bearing, it gets its own future plan — not a smuggled scope-creep here.

## 3. Architecture

Five focused workstreams. Each is independently testable and shippable. They touch a small, predictable set of files:

| # | Workstream | Files added | Files edited |
|---|-----------|------------|-------------|
| 1 | Signup lockdown | — | `src/proxy.ts`, `src/app/signup/page.tsx`, `src/app/login/page.tsx`, `src/server/actions/auth.ts`, `src/lib/copy.ts`, `docs/deploy.md` |
| 2 | Toast + form-error UX | `src/components/ui/sonner.tsx` (shadcn), `src/server/actions/result.ts` | `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/expenses/new/_components/*`, `src/app/categories/_components/*`, `src/app/settings/_components/*`, all 6 files under `src/server/actions/` |
| 3 | PWA shell | `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `public/sw.js`, `src/components/sw-register.tsx`, `src/app/icon.svg` | `src/app/layout.tsx` (viewport + appleWebApp), `src/lib/copy.ts` |
| 4 | Accessibility quick wins | — | `src/app/globals.css` (focus-visible, prefers-reduced-motion), targeted icon-button files for `aria-label` |
| 5 | Security minimums | — | `src/proxy.ts` (CSP nonce + headers), `next.config.ts` (security headers), `docs/deploy.md` (recovery + backups notes), `package.json` / lockfile (Dependabot) |

No new database tables. No new RLS policies. No new Server Actions beyond the result-helper module. No new pages.

```text
┌────────────────────────────────────────────────────────────┐
│  Browser (PWA)                                             │
│  ┌──────────────────────────┐   ┌───────────────────────┐  │
│  │  Layout                  │   │  Service Worker       │  │
│  │  - Toaster (sonner)      │   │  - no-op fetch handler│  │
│  │  - viewport.themeColor   │   │  - install / activate │  │
│  │  - appleWebApp meta      │   │    (no caching)       │  │
│  └──────────┬───────────────┘   └───────────────────────┘  │
│             │ form action / fetch                          │
└─────────────┼──────────────────────────────────────────────┘
              ▼
┌────────────────────────────────────────────────────────────┐
│  proxy.ts                                                  │
│   1. Generate nonce, set Content-Security-Policy header    │
│   2. Existing: Supabase auth gate + redirect logic         │
│   3. NEW: 404 /signup when SIGNUP_ENABLED !== "true"       │
└────────────┬───────────────────────────────────────────────┘
             ▼
┌────────────────────────────────────────────────────────────┐
│  Server Actions  (always return ActionResult on failure;   │
│                   redirect on success — unchanged)         │
│  Auth: signup gated by env in addition to proxy 404        │
└────────────────────────────────────────────────────────────┘
```

## 4. Workstream 1 — signup lockdown (env-gated)

**Approach:** B2 (env-gate, not delete). Local + preview keep signup working for tests and dev seeding; production has signup behind a 404.

### 4.1 Env variable

A single new env var: **`NEXT_PUBLIC_ALLOW_SIGNUP`**.

- **Local `.env.local`:** `NEXT_PUBLIC_ALLOW_SIGNUP=true`
- **Vercel preview:** `NEXT_PUBLIC_ALLOW_SIGNUP=true` (so PR previews can be exercised end-to-end)
- **Vercel production:** **`NEXT_PUBLIC_ALLOW_SIGNUP=false`** (or unset — both treated as off)

The `NEXT_PUBLIC_` prefix is required because the link visibility in the login page is rendered server-side but the value also needs to be readable from a Client Component (see §4.3) without a per-request fetch. The flag is not sensitive — knowing it is `false` reveals nothing. Only the value `"true"` (case-sensitive) opens signup; anything else (including the literal string `"false"`, missing, empty) keeps it closed.

### 4.2 Three layers of gating (defense in depth)

1. **`src/proxy.ts`** — when `NEXT_PUBLIC_ALLOW_SIGNUP !== "true"`, drop `/signup` from `PUBLIC_PATHS`. The existing logic then redirects unauthenticated visitors to `/login` (anonymous users can't tell whether the route exists), and authenticated visitors continue to be redirected to `/`. No new branch, no rewrite-to-404 — we reuse the path the proxy already enforces. This check happens before the Supabase user lookup so it short-circuits cheaply.
2. **`src/app/signup/page.tsx`** — at the top of the Server Component, `if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") notFound()`. Belt and suspenders for direct page renders that bypass the proxy (e.g., a missed matcher rule).
3. **`src/server/actions/auth.ts` → `signupAction`** — first line: `if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") return { ok: false, fieldErrors: {}, formError: copy.auth.signupDisabled }`. Last line of defense for direct POSTs to the action endpoint.

### 4.3 Login-page link

`src/app/login/page.tsx` currently renders an unconditional "Non hai un account? Registrati" link. Replace with:

```tsx
{process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true" && (
  <p className="text-sm text-center">
    {copy.auth.noAccount} <Link href="/signup">{copy.auth.goSignup}</Link>
  </p>
)}
```

In production the paragraph never renders. No visual placeholder, no comment in DOM.

### 4.4 Supabase dashboard

Independently of the code, in the **production** Supabase project: **Authentication → Providers → Email → "Allow new users to sign up" = OFF**. Documented as a step in `docs/deploy.md`. This is the second bracket: even if the env var leaks back to `true` in production by mistake, Supabase rejects the signup at the API layer.

### 4.5 New copy strings

`src/lib/copy.ts` gains `auth.signupDisabled = "Registrazione disabilitata."`. Used only by the action's last-line guard (fallback if a request slips past the proxy + page guard).

### 4.6 Deploy doc

`docs/deploy.md` step 1.3 (the existing "disable Confirm email" line) gains a sibling: turn off "Allow new users to sign up" in the same dashboard pane. A new section "Recovering an account" documents the two-step manual flow (Supabase Studio → Auth → Users → "Send password recovery").

## 5. Workstream 2 — toast + form-error UX

**Goal:** every Server Action either redirects on success, returns a typed error consumed via `useActionState`, or fires a toast — never silently fails.

### 5.1 Library + setup

- Add **`sonner`** via the shadcn CLI: `pnpm dlx shadcn@latest add sonner`. This generates `src/components/ui/sonner.tsx` themed against our `@theme` tokens.
- Mount `<Toaster />` in `src/app/layout.tsx` once, after `{children}`. Props:
  - `position="bottom-center"` (mobile-first; bottom-right would clash with the FAB on `/`)
  - `theme="light"` (the app is light-only; `system` would inherit dark from OS even though our tokens are tuned for clay-50)
  - `richColors` — leverages sonner's `success`/`error` palette which we override with our terracotta/clay tokens via `toastOptions.classNames`
  - `closeButton` — visible close icon for accessibility
  - `duration={4000}`, `gap={12}`, `offset={24}`
  - `dir="ltr"`

### 5.2 Action result contract

Single shared module: **`src/server/actions/result.ts`**.

```ts
export type ActionResult<F extends string = string> =
  | { ok: true }                                    // not normally returned — most actions redirect
  | { ok: false; fieldErrors: Partial<Record<F, string>>; formError?: string };

export const initialResult: ActionResult = { ok: false, fieldErrors: {} };

export const fromZod = <F extends string>(err: z.ZodError) => ({
  ok: false as const,
  fieldErrors: Object.fromEntries(
    Object.entries(err.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]])
  ) as Partial<Record<F, string>>,
});
```

Every Server Action under `src/server/actions/` is migrated to:

- accept `(state: ActionResult, formData: FormData)` (the `useActionState` shape).
- return `ActionResult` for any caught failure; `redirect()` on success (Next throws to terminate, no return needed).
- use `fromZod()` for validation failures.

Existing call sites pass `state` from `useActionState` and use the inline `state.fieldErrors.password` / `state.formError` shape on the page.

### 5.3 Per-page wiring

Pages migrated to `useActionState` (each becomes a thin Client Component below a Server Component shell, or a single `"use client"` page where the existing page is already trivial):

| Page | Form errors displayed | Success path |
|------|----------------------|---------------|
| `/login` | inline `formError` ("Email o password errata"), per-field for Zod misses | redirect to `/` |
| `/signup` (dev/preview only) | inline | redirect to `/` |
| `/expenses/new` | inline + toast `Spesa aggiunta` after redirect (toast triggered via search-param flag) | redirect to `/` |
| `/categories` (add + edit) | inline | toast `Categoria aggiornata` after redirect |
| `/settings` (profile + cycle) | inline | toast `Impostazioni salvate` |

The "toast after redirect" pattern uses a single `?toast=<key>` search param. The dashboard layout reads the param on mount in a tiny `<ToastFromQuery />` client component, fires the matching toast from a string→string copy map, then `router.replace` to strip the param. This avoids a global state library and keeps Server Actions fire-and-forget.

### 5.4 Toast catalog

Defined in `src/lib/copy.ts` under `copy.toast`:

```ts
toast: {
  expenseAdded: "Spesa aggiunta",
  expenseDeleted: "Spesa rimossa",
  categorySaved: "Categoria aggiornata",
  categoryDeleted: "Categoria rimossa",
  settingsSaved: "Impostazioni salvate",
  unexpectedError: "Si è verificato un errore. Riprova.",
},
```

Import flow already has its own success screen — its existing copy stays in place; we don't duplicate via toast.

### 5.5 Unexpected-error fallback

Server Actions wrap their happy path in a top-level `try/catch`. Caught exceptions return `{ ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError }`. The page chooses to render this inline (auth, settings) or via toast (mutation that doesn't redirect). RLS-rejection errors flow through this same path; the user sees the generic message, the original error is logged on the server.

## 6. Workstream 3 — PWA shell

**Outcome:** "Aggiungi alla schermata Home" on iOS Safari and Android Chrome installs the app with the right name, icon, and theme color. Once installed, opening the icon launches the standalone PWA chrome (no Safari URL bar).

**Online-only.** No offline write queue, no background sync, no install-prompt UI. The service worker exists only because Chromium-based browsers won't show their install affordance without one — the SW does no caching.

### 6.1 Manifest — `src/app/manifest.ts`

```ts
import type { MetadataRoute } from "next";
import { copy } from "@/lib/copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: copy.app.title,            // "Budget"
    short_name: copy.app.shortName,  // "Budget" (≤ 12 chars; same here)
    description: copy.app.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F4EE",     // clay-50  ← oklch(0.974 0.010 60), converted at impl time
    theme_color: "#C36842",          // terra-500 ← oklch(0.581 0.133 38), converted at impl time (status bar tint)
    lang: "it",
    icons: [
      { src: "/icon-192.png",     sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png",     sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-mask-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

The hex literals are sRGB approximations of our `--color-clay-50` and `--color-terra-500` OKLCH tokens. The implementer converts the OKLCH values to sRGB hex (e.g., via `culori`'s `formatHex(oklch(...))`) and pastes the result with a code-comment naming the source token. They are duplicated **here only** (the manifest can't read CSS variables); if `--color-clay-50` or `--color-terra-500` change in `globals.css`, this file must be updated.

### 6.2 Icons

Three PNGs in `public/`, generated from a single source SVG `public/icon.svg`:

- **`/icon-192.png`** — 192×192, transparent corners, full-bleed `terra-500` circle with a `clay-50` letter "**B**" set in DM Serif Display.
- **`/icon-512.png`** — same, scaled up.
- **`/icon-mask-512.png`** — maskable variant: `terra-500` fills the entire 512×512 (no transparency); the "B" sits inside the safe area (centered, ~80% of inner circle radius). Required so Android adaptive icons don't crop.

Generation: a one-shot script `scripts/generate-icons.ts` (kept out of `pnpm build`) takes `public/icon.svg` and emits the three PNGs via `sharp`. Output committed to `public/`. `sharp` is added as a `devDependency` only; runtime stays untouched.

For Apple devices, **`src/app/apple-icon.tsx`** uses Next's file-based metadata convention to render a 180×180 `apple-touch-icon` with the same design (no transparency, rounded by iOS automatically). Co-located with the layout so Next emits the `<link rel="apple-touch-icon" />` tag automatically.

### 6.3 Layout meta — `src/app/layout.tsx`

Two additions to the existing file:

```ts
export const viewport: Viewport = {
  themeColor: "#C36842",            // matches manifest theme_color (terra-500 sRGB)
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",             // safe-area awareness for iPhone notch
};

export const metadata: Metadata = {
  title: copy.app.title,
  description: copy.app.description,
  appleWebApp: {
    capable: true,
    title: copy.app.title,         // standalone-launch app name on iOS
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
};
```

Body needs `pb-[env(safe-area-inset-bottom)]` and `pt-[env(safe-area-inset-top)]` utilities (added once in `globals.css` as `.safe-area`) so content doesn't slide under the iOS home indicator in standalone mode.

### 6.4 Service worker — `public/sw.js` + `src/components/sw-register.tsx`

Minimal SW satisfying Chromium's install criteria:

```js
// public/sw.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* network handles it, no caching */ });
```

Registration component (Client Component, mounted from layout):

```tsx
"use client";
import { useEffect } from "react";
export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // dev-noise free
    navigator.serviceWorker.register("/sw.js").catch(() => { /* silent */ });
  }, []);
  return null;
}
```

The `process.env.NODE_ENV` check prevents the SW from interfering with HMR in `pnpm dev`. There is no precaching, no stale-while-revalidate, no Workbox — adding any caching to the SW would create a "stale UI after deploy" class of bug we don't want to debug for two users.

### 6.5 Install affordance

None in v1. We rely on the OS's native install path:

- **iOS Safari:** Share → "Aggiungi alla schermata Home"
- **Android Chrome:** triple-dot menu → "Installa l'app"

Custom install banners (`beforeinstallprompt`) are out of scope. If we later want a "Install Budget" prompt on a settings page, that's its own follow-up.

## 7. Workstream 4 — accessibility quick wins

Surgical pass, not a full audit. Three concrete changes, then a 30-minute manual sweep.

### 7.1 Focus-visible

`src/app/globals.css` adds:

```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--color-terracotta-500);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  :focus:not(:focus-visible) { outline: none; }
}
```

Audit pass: open every interactive surface (buttons, inputs, drawer triggers, FAB, links) and confirm the ring is visible against the local background. Fix specific cases (e.g., FAB's terracotta background needs a clay-50 ring) by adding a `data-focus-ring="contrast"` opt-out attribute and a matching CSS rule.

### 7.2 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Targeted carve-outs only if a specific motion is critical to comprehension (none currently).

### 7.3 ARIA labels on icon-only buttons

Every `<button>` / `<Link>` whose only child is a `lucide-react` icon gets an `aria-label` from `copy.a11y.*`. Targets identified by grep: FAB, drawer close (×), back-link icon, mapping edit icons, import row toggles, etc. Single PR-level checklist; no new abstraction.

### 7.4 Tap-target spot-check

Manual: open the app at 375×667 in Chrome devtools and tap-test each interactive element. Anything < 44×44 px gets `min-h-11 min-w-11` (Tailwind 11 ≈ 44 px) added directly. The drawer close × and a few mapping list icons are the most likely offenders.

### 7.5 Out of scope here

- Formal axe / Lighthouse accessibility CI gate.
- Screen-reader walkthroughs (manual or automated).
- Color-contrast tooling against OKLCH tokens (visual spot-check only).

These move to a hypothetical Plan 4 if they ever become real requirements.

## 8. Workstream 5 — security minimums

Three small things. None of them gates us; together they raise the floor.

### 8.1 CSP via `src/proxy.ts`

Extend the existing proxy to set a `Content-Security-Policy` header with a per-request nonce, before the Supabase auth check.

```ts
// inside proxy(req):
const nonce = btoa(crypto.randomUUID());
const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""};
  style-src-attr 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

// requestHeaders.set('x-nonce', nonce);
// requestHeaders.set('Content-Security-Policy', cspHeader);
// res.headers.set('Content-Security-Policy', cspHeader);
```

The Supabase URL is allowed in `connect-src` so the auth + realtime channels reach the project domain. `font-src 'self' data:` allows the Geist fonts vendored by `next/font` which inline as data URIs. `frame-ancestors 'none'` disables clickjacking. `form-action 'self'` keeps form posts on-domain.

`style-src-attr 'unsafe-inline'` is set unconditionally (dev and prod) because Recharts (and a few shadcn primitives) emit inline `style="…"` HTML attributes that `style-src` does not cover. The risk surface of attribute-only inline styles is materially smaller than `'unsafe-inline'` on whole `<style>` blocks — no script execution, no `expression()`. If we ever drop Recharts in favor of an SVG-only chart that doesn't need this, we can tighten it then.

The dev-mode carve-outs (`'unsafe-eval'` for React DevTools / Turbopack and `'unsafe-inline'` on `style-src` for Tailwind v4's HMR style injection) are conditional on `NODE_ENV`. Production stays strict.

The matcher already excludes `_next/`, `api/`, and asset URLs, so the CSP only applies to HTML responses.

### 8.2 Other security headers via `next.config.ts`

A static `headers()` block adds the rest in one place:

```ts
headers: async () => [{
  source: "/:path*",
  headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options",        value: "DENY" },        // duplicates frame-ancestors above; defense in depth
    { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
  ],
}],
```

`Strict-Transport-Security` is set automatically by Vercel; we don't override.

### 8.3 Dependabot alert

Resolve the open GitHub Dependabot alert (whichever package; expect a single transitive bump). Verify with `pnpm audit --prod` showing no high/critical findings. Add `pnpm audit --prod` as a step to the pre-merge checklist in `CLAUDE.md`.

### 8.4 What's deliberately not here

- WAF / Cloudflare / Vercel Firewall rules — overkill for two users.
- Bot challenges — no public surface that needs them.
- Login rate-limiting in app code — Supabase Auth throttles internally.
- CSP report-uri / report-to — no place to send reports for a two-user app.
- Subresource Integrity — Next's build hashes are sufficient for a single-origin app.

## 9. Testing

Each workstream gets a tight slice of new tests; nothing tests the framework's own behavior.

| Workstream | Unit | Integration (`vitest` + local Supabase) | E2E (`playwright`) |
|-----------|------|------------------------------------------|---------------------|
| 1 — signup lockdown | `src/proxy.test.ts` (table test: `/signup` rewrites to 404 when env not `true`; passes through when `true`) | `signupAction.test.ts` — when `NEXT_PUBLIC_ALLOW_SIGNUP !== "true"`, returns `formError` and creates no auth user | `signup-disabled.spec.ts` — visit `/signup` in production-mode build, expect 404; link absent on `/login` |
| 2 — toast + form errors | `result.test.ts` (`fromZod` mapping; happy path) | each Server Action's failure branch returns the new `ActionResult` shape | `login-bad-password.spec.ts` (existing E2E updated) — bad password shows inline error, password field cleared, button re-enabled. Add `expense-add-toast.spec.ts` — added expense triggers toast on dashboard |
| 3 — PWA | — | — | `pwa-manifest.spec.ts` — request `/manifest.webmanifest`, parse JSON, assert `name`, `start_url`, `theme_color`, three icons. `apple-touch.spec.ts` — assert `<link rel="apple-touch-icon">` in HTML head |
| 4 — accessibility | — | — | `a11y-focus-ring.spec.ts` — Tab through `/login`, assert `:focus-visible` outline on every interactive element via `getComputedStyle`. `reduced-motion.spec.ts` emulating `prefers-reduced-motion: reduce` — animation durations ≤ 1ms |
| 5 — security | — | `proxy.test.ts` — CSP header present, contains `nonce-`, contains the Supabase URL in `connect-src`, contains `frame-ancestors 'none'` | `security-headers.spec.ts` — request `/`, assert all four `next.config.ts` headers + the CSP from proxy |

Existing test suite stays green: 38 unit/integration tests + the 4 Playwright E2E + the wallet-import E2E.

## 10. Rollout

A single PR per workstream, in this order. Each PR is independently mergeable, ships in production behind no flag (signup gate is the env var; everything else is on by default), and adds value standalone:

1. **PR #1 — signup lockdown.** Smallest blast radius, immediate security win. Includes deploy-doc updates and the Supabase dashboard step. The dashboard toggle happens as part of the PR's deploy checklist; the env var is set in Vercel before merge.
2. **PR #2 — security headers + CSP.** Independent of others; lands the `proxy.ts` + `next.config.ts` changes and the Dependabot bump. Tests catch any header-blocked behavior locally.
3. **PR #3 — toast + form-error UX.** Bigger surface area. Includes the `ActionResult` migration of all six action files in one go (changing all callers atomically is cheaper than a half-migrated state). Manual smoke at mobile viewport before merge.
4. **PR #4 — PWA shell.** Manifest, icons, SW, layout meta, install instructions in `docs/deploy.md`. After merge, manually test "Add to Home Screen" on at least one iOS device and one Android device before declaring done.
5. **PR #5 — accessibility quick wins.** CSS-only changes plus aria-label sweep. Smallest visual diff; ships last because the CSS rules apply on top of any focus styles introduced earlier.

`ROADMAP.md` is updated in PR #5 (or a follow-up doc commit) to mark Plan 3 as shipped.

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CSP nonce breaks Supabase realtime / inline styles from third-party libs | Medium | Page renders blank or breaks silently | Develop the CSP locally with browser-console CSP-violation logging; iterate the directives until clean. Tests assert key directives present. Roll out in PR #2 with manual smoke before merge. |
| Service worker caches stale assets after deploy | Low (SW does no caching) | App stuck on old version | SW is deliberately no-op. If we ever add caching, that's a new design decision. |
| iOS PWA standalone mode hides the URL — users can't share a link | Low | Mild annoyance | Acceptable for a two-user app. Not worth a custom share button in v1. |
| `useActionState` migration leaves a stale form state on re-submit | Medium | Wrong error persists across submits | Always reset state via the explicit return path; integration tests cover the "fix and resubmit" sequence per form. |
| Maskable icon mis-cropped on Android | Low | Ugly icon | Test with [maskable.app](https://maskable.app) before committing; safe-area stays at 80% radius. |
| Dependabot bump cascades into a breaking transitive change | Low | Build fails | The fix lives on its own PR (#2's tail end); revert is a single git commit. |

## 12. Open questions / decisions deferred to implementation

None blocking. Decisions made during brainstorming and recorded above:

- Signup lockdown approach: B2 (env-gate, not delete) — chosen.
- Push notifications: out — confirmed.
- Email-confirmation flow + `/auth/callback`: out — confirmed.
- In-app password recovery: out — recovery is manual via Supabase Studio, documented.
- Visual-regression tests: out — confirmed.
- Performance audit: out — confirmed.
- Backups runbook: collapsed to a single sentence in `docs/deploy.md`.

Anything new that comes up during implementation goes into a follow-up plan, not a scope-creep PR.
