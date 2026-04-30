# Plan 3 — PWA Shell + Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Plan 3 of the budget app — five focused, independently-mergeable PRs that lock down signup, install a real toast/error UX, dress the app as an installable Android PWA, sweep accessibility quick wins, and apply security minimums (CSP + headers + Dependabot). No new features or DB tables; this plan is about *trust* and *polish* for daily two-user use.

**Architecture:** Each phase below maps to one PR. Phases are independent and order-of-merge follows the order here. Inside a phase, follow TDD: write the failing test, watch it fail, write the minimum code, watch it pass, then commit.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `proxy.ts` middleware), React 19 (`useActionState`), TypeScript strict, Tailwind v4 + shadcn/ui (existing tokens), Supabase (Postgres + RLS), Zod, **sonner** (new toast lib), **sharp** (devDep, icon generation), **culori** (devDep, OKLCH→sRGB), Vitest (unit + integration), Playwright (E2E), pnpm.

**Spec:** [`docs/superpowers/specs/2026-04-30-budget-pwa-hardening-design.md`](../specs/2026-04-30-budget-pwa-hardening-design.md)

**Coding rules (from `CLAUDE.md`):**
- Italian-only UI strings live in `src/lib/copy.ts`. Never inline.
- All colors/spacing/radii from `DESIGN.md` tokens. No hex literals in components (manifest is the only exception — see Phase 4 Task 4.5).
- Pure libs under `src/lib/` import nothing from `next`, `react`, or `@supabase/*`.
- All mutations through Server Actions; all reads through Server Components or `src/server/queries/`.
- Mobile-first ≤ 420 px portrait, ≥ 44 × 44 px tap targets, no hover-only patterns.
- Commit as `brunoteo <brunoteo@hotmail.it>` (the local `.git/config` already pins this — don't override).
- Run `pnpm typecheck && pnpm lint && pnpm test` before claiming any task complete.
- After a Phase ends, also run `pnpm test:e2e` (start `pnpm db:start` first if needed).

**Target devices for PWA work:** Android only. No iOS Safari testing or apple-touch-icon assets.

---

## Phase map

| Phase | PR title (suggested)                          | Touches                                                                                   |
|-------|-----------------------------------------------|-------------------------------------------------------------------------------------------|
| 1     | `feat(auth): env-gated signup lockdown`       | `proxy.ts`, `signup/page.tsx`, `login/page.tsx`, `actions/auth.ts`, `copy.ts`, deploy doc |
| 2     | `feat(security): CSP + headers + dep audit`   | `proxy.ts`, `next.config.ts`, lockfile, CLAUDE.md                                         |
| 3     | `feat(ux): toast + form errors via sonner`    | `sonner.tsx` (shadcn), `actions/result.ts`, all 6 action files, all 4 form pages          |
| 4     | `feat(pwa): Android installable shell`        | `manifest.ts`, `icon.svg` + generated PNGs, `favicon.ico`, `sw.js`, `sw-register.tsx`, `layout.tsx`, `globals.css`, `scripts/generate-icons.ts` |
| 5     | `feat(a11y): focus-visible, reduced-motion, aria-labels` | `globals.css`, icon-only button files, `copy.ts`                                          |

After Phase 5 lands, the closing Task 5.10 marks Plan 3 as ✅ in `ROADMAP.md`.

---

# Phase 1 — Signup lockdown (env-gated)

**Outcome:** In production, `/signup` is invisible (no link on `/login`) and unreachable via three independent guards (proxy redirect, page-level `notFound()`, action-level guard). In local + preview the route still works for dev seeding and E2E tests.

**New env var:** `NEXT_PUBLIC_ALLOW_SIGNUP`. Truthy = `"true"` (case-sensitive). Anything else = off.

## Task 1.1: Add `signupDisabled` copy string

**Files:**
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Add the copy string under `auth`**

In `src/lib/copy.ts`, find the existing `auth` object (it already has `loginTitle`, `signupTitle`, `noAccount`, `goSignup`, etc.). Add one new key alongside the others:

```ts
auth: {
  // ... existing keys unchanged ...
  signupDisabled: "Registrazione disabilitata.",
},
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/copy.ts
git commit -m "feat(copy): add auth.signupDisabled string"
```

---

## Task 1.2: Extract `isPublicPath` helper for testable proxy logic

**Files:**
- Create: `src/lib/auth/public-paths.ts`
- Create: `tests/unit/auth-public-paths.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/auth-public-paths.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";

describe("isPublicPath", () => {
  it("treats /login as public regardless of signup flag", () => {
    expect(isPublicPath("/login", "true")).toBe(true);
    expect(isPublicPath("/login", "false")).toBe(true);
    expect(isPublicPath("/login", undefined)).toBe(true);
    expect(isPublicPath("/login/forgot", "false")).toBe(true);
  });

  it("treats /signup as public only when allowSignup is the string 'true'", () => {
    expect(isPublicPath("/signup", "true")).toBe(true);
    expect(isPublicPath("/signup", "false")).toBe(false);
    expect(isPublicPath("/signup", undefined)).toBe(false);
    expect(isPublicPath("/signup", "TRUE")).toBe(false); // case-sensitive
    expect(isPublicPath("/signup", "1")).toBe(false);    // value must be exactly "true"
  });

  it("does not match a path that just contains the public prefix", () => {
    expect(isPublicPath("/loginz", "true")).toBe(false);
    expect(isPublicPath("/signupx", "true")).toBe(false);
  });

  it("rejects everything else", () => {
    expect(isPublicPath("/", "true")).toBe(false);
    expect(isPublicPath("/expenses/new", "true")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, watch it fail**

Run: `pnpm test tests/unit/auth-public-paths.test.ts`
Expected: FAIL — module `@/lib/auth/public-paths` not found.

- [ ] **Step 3: Implement the helper**

`src/lib/auth/public-paths.ts`:

```ts
const ALWAYS_PUBLIC = ["/login"] as const;
const SIGNUP_PATH = "/signup";

function startsWithSegment(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  return pathname.startsWith(prefix + "/");
}

export function isPublicPath(
  pathname: string,
  allowSignup: string | undefined,
): boolean {
  if (ALWAYS_PUBLIC.some((p) => startsWithSegment(pathname, p))) return true;
  if (allowSignup === "true" && startsWithSegment(pathname, SIGNUP_PATH)) return true;
  return false;
}
```

- [ ] **Step 4: Run the test, watch it pass**

Run: `pnpm test tests/unit/auth-public-paths.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/public-paths.ts tests/unit/auth-public-paths.test.ts
git commit -m "feat(auth): isPublicPath helper gated by NEXT_PUBLIC_ALLOW_SIGNUP"
```

---

## Task 1.3: Wire `isPublicPath` into `proxy.ts`

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Replace the inline `PUBLIC_PATHS` array with the helper**

`src/proxy.ts` — replace the top constant and the `isPublic` line:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicPath } from "@/lib/auth/public-paths";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set({ name, value, ...options }),
          ),
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const isPublic = isPublicPath(
    req.nextUrl.pathname,
    process.env.NEXT_PUBLIC_ALLOW_SIGNUP,
  );
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

The behavior is identical to before *when* `NEXT_PUBLIC_ALLOW_SIGNUP === "true"`. Otherwise, an unauthenticated visit to `/signup` is redirected to `/login` (the same fall-through that protects every other private page).

- [ ] **Step 2: Run all tests**

Run: `pnpm typecheck && pnpm test`
Expected: passes (the unit test from Task 1.2 covers the helper; existing integration tests don't exercise the proxy directly).

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(proxy): gate /signup behind NEXT_PUBLIC_ALLOW_SIGNUP"
```

---

## Task 1.4: Add `notFound()` guard inside the signup page

**Files:**
- Modify: `src/app/signup/page.tsx`

- [ ] **Step 1: Add the guard at the top of the component**

`src/app/signup/page.tsx` — add the `notFound` import and an early return:

```tsx
import { notFound } from "next/navigation";
import { signupAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import Link from "next/link";

export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") notFound();

  return (
    // ... unchanged JSX ...
  );
}
```

- [ ] **Step 2: Manual smoke**

```bash
NEXT_PUBLIC_ALLOW_SIGNUP=false pnpm dev
```

Visit `http://localhost:3000/signup` — expect Next's default 404 page.

Stop the dev server, restart with `NEXT_PUBLIC_ALLOW_SIGNUP=true pnpm dev` (or rely on `.env.local` once Task 1.7 sets it), confirm the form still renders.

- [ ] **Step 3: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat(signup): notFound() when NEXT_PUBLIC_ALLOW_SIGNUP is off"
```

---

## Task 1.5: Add early-return guard inside `signupAction`

**Files:**
- Modify: `src/server/actions/auth.ts`
- Modify: `tests/integration/auth-actions.test.ts` (create if it doesn't exist — see Step 1)

- [ ] **Step 1: Write the failing integration test**

If `tests/integration/auth-actions.test.ts` does not yet exist, create it. Either way, append this test:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signupAction } from "@/server/actions/auth";
import { admin, deleteTestUsers } from "./_helpers";

const FIXED_EMAIL = "test-signup-blocked@example.com";

describe("signupAction with NEXT_PUBLIC_ALLOW_SIGNUP off", () => {
  const original = process.env.NEXT_PUBLIC_ALLOW_SIGNUP;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_ALLOW_SIGNUP = "false";
  });

  afterAll(async () => {
    process.env.NEXT_PUBLIC_ALLOW_SIGNUP = original;
    await deleteTestUsers([FIXED_EMAIL]);
  });

  it("returns the disabled error and creates no auth user", async () => {
    const fd = new FormData();
    fd.set("email", FIXED_EMAIL);
    fd.set("password", "TestPassword!1");
    fd.set("displayName", "Blocked");
    fd.set("cycleStartDay", "1");

    const result = await signupAction(fd);
    expect(result).toEqual({ error: "Registrazione disabilitata." });

    const { data } = await admin().auth.admin.listUsers();
    expect(data.users.find((u) => u.email === FIXED_EMAIL)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, watch it fail**

Run: `pnpm test tests/integration/auth-actions.test.ts`
Expected: FAIL — `signupAction` currently calls Supabase regardless of the env var.

(If your local Supabase isn't running, `pnpm db:start` first.)

- [ ] **Step 3: Add the guard to `signupAction`**

In `src/server/actions/auth.ts`, at the top of `signupAction`:

```ts
import { copy } from "@/lib/copy";
// ... existing imports ...

export async function signupAction(formData: FormData) {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") {
    return { error: copy.auth.signupDisabled };
  }
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  // ... rest unchanged ...
}
```

(Phase 3 will migrate this whole module to the new `ActionResult` shape; for now the existing `{ error }` return is fine.)

- [ ] **Step 4: Run, watch it pass**

Run: `pnpm test tests/integration/auth-actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/auth.ts tests/integration/auth-actions.test.ts
git commit -m "feat(auth): signupAction rejects when signup is gated off"
```

---

## Task 1.6: Conditionally render the "Registrati" link on `/login`

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Wrap the link paragraph in a flag check**

```tsx
import { loginAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import Link from "next/link";

export default function LoginPage() {
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";
  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.loginTitle}</h1>
      <form
        action={async (fd) => { "use server"; await loginAction(fd); }}
        className="space-y-3"
      >
        {/* ...existing inputs unchanged... */}
        <button type="submit" className="w-full rounded bg-slate-900 p-3 text-white">
          {copy.auth.submitLogin}
        </button>
      </form>
      {allowSignup && (
        <p className="text-sm text-center">
          {copy.auth.noAccount}{" "}
          <Link href="/signup" className="underline">{copy.auth.goSignup}</Link>
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke at both flag values**

`NEXT_PUBLIC_ALLOW_SIGNUP=true pnpm dev` → link visible. Stop, restart with `false` → link absent, no leftover whitespace or comment in DOM.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(login): hide signup link when signup is gated off"
```

---

## Task 1.7: Add `NEXT_PUBLIC_ALLOW_SIGNUP=true` to local `.env.local`

**Files:**
- Modify: `.env.local` (do **not** commit; it is gitignored)

- [ ] **Step 1: Append the line**

Open `.env.local` and add:

```
NEXT_PUBLIC_ALLOW_SIGNUP=true
```

- [ ] **Step 2: Restart `pnpm dev` and confirm signup works locally**

Visit `/signup`, fill the form, expect normal redirect to `/`. (Use a throwaway email — clean up via Supabase Studio later or rely on `pnpm db:reset`.)

- [ ] **Step 3: No commit** — `.env.local` is intentionally untracked.

---

## Task 1.8: Add Playwright E2E for both states

**Files:**
- Create: `tests/e2e/signup-gating.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from "@playwright/test";

const flag = process.env.NEXT_PUBLIC_ALLOW_SIGNUP;

test.describe("signup gating", () => {
  test.skip(flag !== "true", "covers the dev-mode path; see deploy.md for prod expectation");

  test("allows reaching the signup form when flag is true", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("button", { name: /registrati/i })).toBeVisible();
  });

  test("login page renders the Registrati link when flag is true", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /registrati/i })).toBeVisible();
  });
});

test.describe("signup gating — disabled (manual)", () => {
  test.skip(flag === "true", "Run with NEXT_PUBLIC_ALLOW_SIGNUP=false to exercise this branch");

  test("/signup redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login page hides the Registrati link", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /registrati/i })).toHaveCount(0);
  });
});
```

The two `describe` blocks self-skip based on the current env so the suite stays green in dev (where signup is on) yet still documents the disabled-path expectation. Run the disabled half manually with:

```bash
NEXT_PUBLIC_ALLOW_SIGNUP=false pnpm test:e2e tests/e2e/signup-gating.spec.ts
```

- [ ] **Step 2: Run with flag=true**

```bash
pnpm test:e2e tests/e2e/signup-gating.spec.ts
```

Expected: 2 tests pass, 2 skipped.

- [ ] **Step 3: Run with flag=false**

```bash
NEXT_PUBLIC_ALLOW_SIGNUP=false pnpm test:e2e tests/e2e/signup-gating.spec.ts
```

Expected: 2 tests pass, 2 skipped.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/signup-gating.spec.ts
git commit -m "test(e2e): signup gating in both flag states"
```

---

## Task 1.9: Update `docs/deploy.md`

**Files:**
- Modify: `docs/deploy.md`

- [ ] **Step 1: Edit the Auth-config step (currently §1.3)**

Replace the line "Disable **Confirm email** (single-couple app — emails are trusted)." with:

```markdown
   - Disable **Confirm email** (single-couple app — emails are trusted).
   - Disable **"Allow new users to sign up"** (Authentication → Providers → Email). Both production accounts already exist; turning this off prevents the Supabase API from accepting any new signups even if the env-var guard is misconfigured.
```

- [ ] **Step 2: Add a new env-var entry under the Vercel step (currently §3.3)**

Append after `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

```markdown
   - `NEXT_PUBLIC_ALLOW_SIGNUP` = `false` (production) — disables `/signup` route, link, and Server Action. Set this **before** the first deploy. Local `.env.local` should set this to `true` so dev seeding and E2E tests still work.
```

- [ ] **Step 3: Add a new "Recovering an account" section after §5**

```markdown
## 6. Recovering an account

If either user forgets their password:

1. Open Supabase Studio for the production project → **Authentication → Users**.
2. Find the user row, click the kebab menu → **Send password recovery**.
3. The user receives a reset link by email and follows the standard Supabase reset flow (no in-app handler — Supabase hosts the form).

If the user's email itself has changed: edit it in the same Users panel, then send recovery to the new address.

## 7. Backups
```

(Renumber the existing "Day-2 operations" / "Troubleshooting" headings down by one if needed; or simply leave them where they are if they are unnumbered.)

- [ ] **Step 4: Add the backups note (single sentence) under the new section 7**

```markdown
## 7. Backups

Supabase free tier ships with 1-day point-in-time recovery, automatic. If/when our data starts mattering, upgrade to **Pro** (US$25/mo per project) for 7-day PITR. No app-side backup runbook for now — the database is the source of truth and Supabase manages the snapshot.
```

- [ ] **Step 5: Commit**

```bash
git add docs/deploy.md
git commit -m "docs(deploy): document signup lockdown env var, recovery, backups"
```

---

## Task 1.10: Phase-1 verification

- [ ] **Step 1: Full local test suite**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: green. (40+ unit/integration; new ones from this phase included.)

- [ ] **Step 2: E2E in default flag state**

Run: `pnpm test:e2e`
Expected: green; the gating spec runs the "flag=true" half.

- [ ] **Step 3: Set the prod env var in Vercel**

In the Vercel dashboard for this project: **Settings → Environment Variables**:
- Production: `NEXT_PUBLIC_ALLOW_SIGNUP` = `false`
- Preview: `NEXT_PUBLIC_ALLOW_SIGNUP` = `true`

(Manual ops step — no git change.)

- [ ] **Step 4: Flip the Supabase dashboard toggle**

In the **production** Supabase project: **Authentication → Providers → Email → "Allow new users to sign up"** = OFF.

- [ ] **Step 5: Open the Phase-1 PR**

Branch suggestion: `feat/signup-lockdown`. PR body summarizes the three layers (proxy, page, action) and references the spec. Merge when CI is green.

---

# Phase 2 — Security minimums (CSP + headers + Dependabot)

**Outcome:** Every HTML response carries a strict CSP with a per-request nonce, four supporting security headers, and the open Dependabot alert is resolved. Nothing about user-visible behavior changes.

## Task 2.1: Add static security headers to `next.config.ts`

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace the empty config**

```ts
import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options",        value: "DENY" },
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Manual smoke**

`pnpm dev`, then in a separate terminal:

```bash
curl -sI http://localhost:3000/login | grep -iE "x-content-type-options|x-frame-options|referrer-policy|permissions-policy"
```

Expected: all four headers present.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(security): static security headers (XCTO, XFO, Referrer, Permissions)"
```

---

## Task 2.2: Add CSP nonce + header to `proxy.ts`

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Insert nonce + CSP construction at the top of `proxy()`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicPath } from "@/lib/auth/public-paths";

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""};
    style-src-attr 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self' data:;
    connect-src 'self' ${supabase};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, " ").trim();
}

export async function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set({ name, value, ...options }),
          ),
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const isPublic = isPublicPath(
    req.nextUrl.pathname,
    process.env.NEXT_PUBLIC_ALLOW_SIGNUP,
  );

  if (!data.user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }
  if (data.user && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
```

The redirect responses also carry the CSP so a 302 doesn't ship without it.

- [ ] **Step 2: Manual CSP smoke**

```bash
pnpm dev
```

In another terminal:

```bash
curl -sI http://localhost:3000/login | grep -i content-security-policy
```

Expected: a single line containing `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' 'unsafe-eval'; …`.

Open the same URL in a browser; open DevTools console; navigate around. Expected: **no CSP-violation messages.** If you see any, copy the directive name from the message and tighten the policy iteratively (likely `connect-src` for an unexpected Supabase subdomain, or `style-src-attr` covering inline-style attributes from a missed lib).

- [ ] **Step 3: Add an integration test asserting the helper output**

Create `tests/unit/proxy-csp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
// We export buildCsp from proxy by re-exporting it through a thin barrel
// to avoid pulling next/server into the test environment.
import { buildCsp } from "@/lib/auth/csp";

describe("buildCsp", () => {
  it("includes the nonce in script-src and style-src", () => {
    const csp = buildCsp("nonce-A");
    expect(csp).toContain("script-src 'self' 'nonce-nonce-A' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-nonce-A'");
  });

  it("includes the Supabase connect-src origin", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    const csp = buildCsp("n");
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co");
  });

  it("locks down framing", () => {
    const csp = buildCsp("n");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows inline-style attributes for Recharts", () => {
    const csp = buildCsp("n");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
  });
});
```

- [ ] **Step 4: Move `buildCsp` into `src/lib/auth/csp.ts` and re-export from proxy**

Create `src/lib/auth/csp.ts` with the `buildCsp` body and the `isDev` / `supabase` lookups. Replace the inline `buildCsp` in `src/proxy.ts` with an import:

```ts
import { buildCsp } from "@/lib/auth/csp";
```

- [ ] **Step 5: Run the test, watch it pass**

Run: `pnpm test tests/unit/proxy-csp.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/proxy.ts src/lib/auth/csp.ts tests/unit/proxy-csp.test.ts
git commit -m "feat(security): CSP nonce + strict directives in proxy"
```

---

## Task 2.3: Browser smoke checklist (no test — but mandatory)

**Files:** none

- [ ] **Step 1: Walk every screen in DevTools with the console open**

Pages to visit in order, watching for CSP-violation messages:

1. `/login` (sign in)
2. `/` (dashboard with KPIs + category list)
3. `/expenses/new` (form + drawer)
4. `/categories` (list + add + edit)
5. `/settings` (profile + cycle form)
6. `/settings/mappings` (mappings list + drawer)
7. `/trends` (Recharts-driven page; **highest risk** because Recharts emits inline-style attributes)
8. `/import` → drag in `tests/fixtures/wallet/sample.csv` → review → commit → undo

For any violation: re-read §8.1 of the spec and tighten the offending directive in `src/lib/auth/csp.ts`. Re-run the smoke.

- [ ] **Step 2: Confirm Supabase auth still works**

Sign in with a test account. The auth network call to the Supabase URL must not be blocked. If it is: double-check the `connect-src` directive lists the exact `NEXT_PUBLIC_SUPABASE_URL` value.

- [ ] **Step 3: No commit unless directives needed tightening.** If they did, fold the change into the previous task's commit via `git commit --amend` only if the Phase-2 PR has not yet been opened — otherwise add a follow-up commit.

---

## Task 2.4: Resolve the open Dependabot alert

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (whichever package is named in the alert)

- [ ] **Step 1: Identify the alert**

```bash
gh api repos/brunoteo/budget/dependabot/alerts --paginate \
  | jq '.[] | select(.state == "open") | {package: .security_advisory.cve_id, severity: .security_advisory.severity, summary: .security_advisory.summary, fixed_in: .security_vulnerability.first_patched_version.identifier, dependency: .dependency.package.name}'
```

Note the dependency name and patched version.

- [ ] **Step 2: Update**

```bash
pnpm update <package-name>
pnpm audit --prod
```

Expected: alert resolved; `pnpm audit --prod` reports no `high` or `critical` advisories.

- [ ] **Step 3: Run the suite**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): resolve Dependabot alert (<package>@<version>)"
```

If there is no open alert at the time of execution, skip the task; the audit step still runs.

---

## Task 2.5: Add `pnpm audit --prod` to the merge checklist in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Edit the "Verification before claiming completion" section**

Add a new bullet under the existing list:

```markdown
- After running the suite, run `pnpm audit --prod` and confirm zero `high`/`critical` advisories. Resolve any new ones in the same PR.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add pnpm audit to pre-merge checklist"
```

---

## Task 2.6: Phase-2 verification

- [ ] **Step 1: Full suite + audit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm audit --prod
```

All green.

- [ ] **Step 2: Open the Phase-2 PR**

Branch suggestion: `feat/csp-headers`. PR body lists the four static headers + the CSP directives + the Dependabot bump. Merge after CI green.

---

# Phase 3 — Toast + form-error UX

**Outcome:** Every Server Action returns either `{ ok: true }` (typically followed by `redirect`), or `{ ok: false, fieldErrors, formError? }`. Forms consume that shape via `useActionState`, render inline errors, and fire toasts for non-form events (post-redirect mutation success, unexpected errors). No silent failures.

## Task 3.1: Install `sonner` via the shadcn CLI

**Files:**
- Create: `src/components/ui/sonner.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Add the component**

```bash
pnpm dlx shadcn@latest add sonner
```

Expected: the CLI writes `src/components/ui/sonner.tsx` and adds `sonner` (and possibly `next-themes`) to `package.json`. If it asks about `next-themes`, accept — sonner uses it internally for theme detection.

- [ ] **Step 2: Configure the Toaster props**

Edit `src/components/ui/sonner.tsx` so the exported `<Toaster />` defaults match the spec §5.1 — light theme, bottom-center, rich colors, close button:

```tsx
"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      theme="light"
      richColors
      closeButton
      duration={4000}
      gap={12}
      offset={24}
      dir="ltr"
      toastOptions={{
        classNames: {
          toast: "rounded-md border border-clay-200 bg-white text-clay-900 shadow-md",
          title: "font-medium",
          description: "text-clay-600",
          success: "border-sage-500 bg-sage-50 text-sage-700",
          error: "border-terra-500 bg-clay-50 text-terra-700",
          actionButton: "bg-terra-500 text-clay-50",
          cancelButton: "bg-clay-200 text-clay-700",
          closeButton: "text-clay-500 hover:text-clay-900",
        },
      }}
      {...props}
    />
  );
}
```

(If any token name doesn't exist in `globals.css`, substitute the closest equivalent and note it. The shadcn-generated file may already include the same structure — keep its scaffolding and only adjust the props/classNames to match the values above.)

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sonner.tsx package.json pnpm-lock.yaml
git commit -m "chore(ui): add sonner toast component"
```

---

## Task 3.2: Define the shared `ActionResult` contract + Zod helper

**Files:**
- Create: `src/server/actions/result.ts`
- Create: `tests/unit/action-result.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { fromZod, initialResult, type ActionResult } from "@/server/actions/result";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

describe("ActionResult", () => {
  it("initialResult is a not-yet-submitted state", () => {
    const r: ActionResult = initialResult;
    expect(r.ok).toBe(false);
    expect(r.fieldErrors).toEqual({});
  });

  it("fromZod maps each field's first error", () => {
    const parsed = Schema.safeParse({ email: "nope", password: "short" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const result = fromZod<"email" | "password">(parsed.error);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
  });

  it("fromZod returns no fieldErrors for fields that passed", () => {
    const parsed = Schema.safeParse({ email: "a@b.co", password: "short" });
    if (parsed.success) throw new Error("should not parse");
    const result = fromZod<"email" | "password">(parsed.error);
    expect(result.fieldErrors.email).toBeUndefined();
    expect(result.fieldErrors.password).toBeDefined();
  });
});
```

- [ ] **Step 2: Run, watch it fail**

Run: `pnpm test tests/unit/action-result.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/server/actions/result.ts`:

```ts
import type { z } from "zod";

export type ActionResult<F extends string = string> =
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<F, string>>; formError?: string };

export const initialResult: ActionResult = { ok: false, fieldErrors: {} };

export function fromZod<F extends string>(err: z.ZodError): ActionResult<F> {
  const flat = err.flatten().fieldErrors as Record<string, string[] | undefined>;
  const fieldErrors = Object.fromEntries(
    Object.entries(flat)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => [k, v![0]]),
  ) as Partial<Record<F, string>>;
  return { ok: false, fieldErrors };
}
```

- [ ] **Step 4: Run, watch it pass**

Run: `pnpm test tests/unit/action-result.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/result.ts tests/unit/action-result.test.ts
git commit -m "feat(actions): ActionResult contract + fromZod helper"
```

---

## Task 3.3: Mount the `<Toaster />` in `layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Insert after `{children}`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { copy } from "@/lib/copy";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: copy.app.title,
  description: copy.app.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-clay-50 text-clay-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Smoke**

```bash
pnpm dev
```

Open `/`, then in the browser console:

```js
window.__sonnerSmoke = () =>
  import("sonner").then((m) => m.toast.success("smoke", { description: "hello" }));
__sonnerSmoke();
```

Expected: a toast appears at bottom-center, dismisses after ~4 s, no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): mount sonner Toaster"
```

---

## Task 3.4: Add the toast catalog to `copy.ts`

**Files:**
- Modify: `src/lib/copy.ts`

- [ ] **Step 1: Append a `toast` namespace**

```ts
export const copy = {
  // ... existing namespaces unchanged ...
  toast: {
    expenseAdded: "Spesa aggiunta",
    expenseDeleted: "Spesa rimossa",
    categorySaved: "Categoria aggiornata",
    categoryDeleted: "Categoria rimossa",
    settingsSaved: "Impostazioni salvate",
    unexpectedError: "Si è verificato un errore. Riprova.",
  },
} as const;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/copy.ts
git commit -m "feat(copy): toast catalog"
```

---

## Task 3.5: Migrate `loginAction` and `signupAction` to `ActionResult`

**Files:**
- Modify: `src/server/actions/auth.ts`
- Modify: `tests/integration/auth-actions.test.ts`

- [ ] **Step 1: Update the integration test from Task 1.5**

The expectation changes from `{ error: "Registrazione disabilitata." }` to `{ ok: false, fieldErrors: {}, formError: "Registrazione disabilitata." }`. Edit the matching `expect(...)` line.

Then add a new test for `loginAction`:

```ts
import { loginAction } from "@/server/actions/auth";

describe("loginAction", () => {
  it("returns fieldErrors for malformed input", async () => {
    const fd = new FormData();
    fd.set("email", "nope");
    fd.set("password", "x");
    const result = await loginAction({ ok: false, fieldErrors: {} }, fd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
  });

  it("returns formError when Supabase rejects credentials", async () => {
    const fd = new FormData();
    fd.set("email", "nobody@example.com");
    fd.set("password", "TestPassword!1");
    const result = await loginAction({ ok: false, fieldErrors: {} }, fd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.formError).toBeDefined();
  });
});
```

- [ ] **Step 2: Run, watch them fail**

Run: `pnpm test tests/integration/auth-actions.test.ts`
Expected: FAIL — current `loginAction` takes only `(formData)` and returns `{ error }`.

- [ ] **Step 3: Migrate the actions**

`src/server/actions/auth.ts`:

```ts
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/db/server";
import { copy } from "@/lib/copy";
import { fromZod, type ActionResult } from "./result";

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

type SignupFields = "email" | "password" | "displayName" | "cycleStartDay";
type LoginFields  = "email" | "password";

export async function signupAction(
  _prev: ActionResult<SignupFields>,
  formData: FormData,
): Promise<ActionResult<SignupFields>> {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") {
    return { ok: false, fieldErrors: {}, formError: copy.auth.signupDisabled };
  }
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<SignupFields>(parsed.error);

  const { email, password, displayName, cycleStartDay } = parsed.data;
  const supabase = await getServerSupabase();
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error || !data.user) {
      return { ok: false, fieldErrors: {}, formError: error?.message ?? copy.toast.unexpectedError };
    }
    await supabase
      .from("profiles")
      .update({ display_name: displayName, cycle_start_day: cycleStartDay })
      .eq("id", data.user.id);
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  redirect("/");
}

export async function loginAction(
  _prev: ActionResult<LoginFields>,
  formData: FormData,
): Promise<ActionResult<LoginFields>> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<LoginFields>(parsed.error);

  const supabase = await getServerSupabase();
  try {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { ok: false, fieldErrors: {}, formError: copy.auth.loginFailed };
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  redirect("/");
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 4: Add the missing copy string**

In `src/lib/copy.ts`, under `auth`, add `loginFailed: "Email o password errata."` next to `signupDisabled`.

- [ ] **Step 5: Run the tests, watch them pass**

Run: `pnpm test tests/integration/auth-actions.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/actions/auth.ts tests/integration/auth-actions.test.ts src/lib/copy.ts
git commit -m "feat(auth): migrate login/signup actions to ActionResult"
```

---

## Task 3.6: Convert `/login` to a Client Component using `useActionState`

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace the page with a Client Component**

```tsx
"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth";
import { copy } from "@/lib/copy";
import { initialResult } from "@/server/actions/result";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialResult);
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

  return (
    <main className="mx-auto max-w-sm p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{copy.auth.loginTitle}</h1>
      <form action={action} className="space-y-3" noValidate>
        <label className="block">
          <span className="text-sm">{copy.auth.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={!state.ok && Boolean(state.fieldErrors.email) || undefined}
            aria-describedby={!state.ok && state.fieldErrors.email ? "email-err" : undefined}
            className="mt-1 w-full rounded border p-3"
          />
          {!state.ok && state.fieldErrors.email && (
            <span id="email-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
              {state.fieldErrors.email}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-sm">{copy.auth.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            aria-invalid={!state.ok && Boolean(state.fieldErrors.password) || undefined}
            aria-describedby={!state.ok && state.fieldErrors.password ? "pwd-err" : undefined}
            className="mt-1 w-full rounded border p-3"
          />
          {!state.ok && state.fieldErrors.password && (
            <span id="pwd-err" className="block mt-1 text-sm text-terra-700" aria-live="polite">
              {state.fieldErrors.password}
            </span>
          )}
        </label>
        {!state.ok && state.formError && (
          <p className="text-sm text-terra-700" aria-live="polite">{state.formError}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-clay-900 p-3 text-clay-50 disabled:opacity-60"
        >
          {pending ? copy.auth.submittingLogin : copy.auth.submitLogin}
        </button>
      </form>
      {allowSignup && (
        <p className="text-sm text-center">
          {copy.auth.noAccount}{" "}
          <Link href="/signup" className="underline">{copy.auth.goSignup}</Link>
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Add the new copy string**

`auth.submittingLogin: "Accesso…"` next to the existing keys.

- [ ] **Step 3: E2E for bad-password path**

Add to `tests/e2e/auth-redirect.spec.ts` (or a new `tests/e2e/login-error.spec.ts`):

```ts
import { test, expect } from "@playwright/test";

test("bad password shows inline error and re-enables submit", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("nobody@example.com");
  await page.getByLabel(/password/i).fill("WrongPass!1");
  await page.getByRole("button", { name: /accedi/i }).click();
  await expect(page.getByText(/email o password errata/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /accedi/i })).toBeEnabled();
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test:e2e tests/e2e/login-error.spec.ts
git add src/app/login/page.tsx src/lib/copy.ts tests/e2e/login-error.spec.ts
git commit -m "feat(login): inline errors via useActionState"
```

---

## Task 3.7: Convert `/signup` to `useActionState` (dev-only flow)

**Files:**
- Modify: `src/app/signup/page.tsx`

- [ ] **Step 1: Mirror the `/login` migration**

Same pattern as Task 3.6:
1. Add `"use client"` directive at the top.
2. Wrap the existing form fields with `useActionState(signupAction, initialResult)`.
3. Render `state.fieldErrors.{displayName,email,password,cycleStartDay}` under each input.
4. Render `state.formError` above the submit button.
5. Disable the submit while `pending`.

The `notFound()` guard from Task 1.4 stays at the top — but it has to run on the server, so the easiest path is: keep `signup/page.tsx` as the Server Component shell that does the `notFound()` check and renders a Client Component `<SignupForm />` defined in `src/app/signup/_components/signup-form.tsx`. Move all interactive code there.

```tsx
// src/app/signup/page.tsx
import { notFound } from "next/navigation";
import { SignupForm } from "./_components/signup-form";

export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "true") notFound();
  return <SignupForm />;
}
```

```tsx
// src/app/signup/_components/signup-form.tsx
"use client";
import { useActionState } from "react";
// ... mirror the login-page structure ...
```

- [ ] **Step 2: Run E2E**

The Phase-1 `signup-gating.spec.ts` should still pass. Run it.

- [ ] **Step 3: Commit**

```bash
git add src/app/signup
git commit -m "feat(signup): inline errors via useActionState (dev path)"
```

---

## Task 3.8: Migrate `expense.ts`, `category.ts`, `cycle.ts`, `profile.ts` actions to `ActionResult`

**Files:**
- Modify: `src/server/actions/expense.ts`, `category.ts`, `cycle.ts`, `profile.ts`
- Modify: `tests/integration/expense-actions.test.ts`, `category-actions.test.ts`, `cycle-actions.test.ts` (no `profile-actions.test.ts` exists currently — write one if any new code path warrants it)

For **each** file (do them one at a time, one commit each):

- [ ] **Step 1: Define the `<Name>Fields` literal-union type**

```ts
type ExpenseFields = "amount" | "categoryId" | "occurredOn" | "note";
```

- [ ] **Step 2: Change the action signature**

```ts
export async function addExpenseAction(
  _prev: ActionResult<ExpenseFields>,
  formData: FormData,
): Promise<ActionResult<ExpenseFields>> {
  const parsed = AddExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod<ExpenseFields>(parsed.error);
  try {
    // existing happy path ...
  } catch {
    return { ok: false, fieldErrors: {}, formError: copy.toast.unexpectedError };
  }
  redirect("/?toast=expenseAdded");
}
```

- [ ] **Step 3: Update the matching integration test**

The existing tests call the actions with just `(formData)`. Pass `initialResult` as the new first argument and assert the new shape. Tests for the *failure* path now check `result.fieldErrors.<name>` rather than `result.error`.

- [ ] **Step 4: Run the targeted test, watch it pass**

Run: `pnpm test tests/integration/<name>-actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit per action file**

```bash
git add src/server/actions/<name>.ts tests/integration/<name>-actions.test.ts
git commit -m "feat(actions): migrate <name> actions to ActionResult"
```

(Four commits, one per action module: expense, category, cycle, profile.)

---

## Task 3.9: Migrate the form pages that call those actions

**Files:**
- Modify: `src/app/expenses/new/page.tsx` (and any `_components/` underneath)
- Modify: `src/app/categories/page.tsx` and its drawers
- Modify: `src/app/settings/page.tsx`

Per page (one commit each):

- [ ] **Step 1:** Convert the page (or extract a Client Component for the form) so it consumes `useActionState(<actionName>, initialResult)`.
- [ ] **Step 2:** Render `state.fieldErrors.<field>` inline beneath the matching input. Use `aria-invalid` + `aria-describedby` linking to the error span.
- [ ] **Step 3:** Render `state.formError` (if any) above the submit button.
- [ ] **Step 4:** Disable the submit button while `pending`.
- [ ] **Step 5:** Run the page in `pnpm dev`, exercise success + at least one validation failure (e.g., negative amount, zero-length name).
- [ ] **Step 6:** Commit.

Use the `/login` migration in Task 3.6 as the reference template. Reuse class names; do not invent new design tokens.

---

## Task 3.10: Add `<ToastFromQuery />` for post-redirect toasts

**Files:**
- Create: `src/components/toast-from-query.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { copy } from "@/lib/copy";

const TOASTS: Record<string, () => void> = {
  expenseAdded:    () => toast.success(copy.toast.expenseAdded),
  expenseDeleted:  () => toast.success(copy.toast.expenseDeleted),
  categorySaved:   () => toast.success(copy.toast.categorySaved),
  categoryDeleted: () => toast.success(copy.toast.categoryDeleted),
  settingsSaved:   () => toast.success(copy.toast.settingsSaved),
};

export function ToastFromQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const key = params.get("toast");

  useEffect(() => {
    if (!key) return;
    const fire = TOASTS[key];
    if (fire) fire();
    const next = new URLSearchParams(params);
    next.delete("toast");
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  }, [key, params, pathname, router]);

  return null;
}
```

- [ ] **Step 2: Mount in layout**

```tsx
// in layout.tsx:
import { ToastFromQuery } from "@/components/toast-from-query";
// ...
<body className="...">
  {children}
  <ToastFromQuery />
  <Toaster />
</body>
```

- [ ] **Step 3: Confirm Task 3.8 actions are issuing the right `?toast=` redirect**

For each migrated action's success redirect, ensure the destination includes the matching key:

| Action               | Redirect target          |
|----------------------|--------------------------|
| `addExpenseAction`   | `/?toast=expenseAdded`   |
| `deleteExpenseAction`| `/?toast=expenseDeleted` |
| `saveCategoryAction` | `/categories?toast=categorySaved` |
| `deleteCategoryAction` | `/categories?toast=categoryDeleted` |
| `saveProfileAction`  | `/settings?toast=settingsSaved` |
| `saveCycleAction`    | `/settings?toast=settingsSaved` |

- [ ] **Step 4: E2E for the dashboard toast**

`tests/e2e/expense-add-toast.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("adding an expense fires the success toast on the dashboard", async ({ page }) => {
  // assumes the golden-path test setup left a logged-in user with a category
  await page.goto("/");
  await page.getByRole("link", { name: /aggiungi/i }).click();
  await page.getByLabel(/importo/i).fill("12,50");
  await page.getByLabel(/categoria/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /salva/i }).click();
  await expect(page.getByText(/spesa aggiunta/i)).toBeVisible();
  await expect(page).toHaveURL(/\/(\?.*)?$/); // toast key cleared from URL
});
```

- [ ] **Step 5: Commit**

```bash
git add src/components/toast-from-query.tsx src/app/layout.tsx tests/e2e/expense-add-toast.spec.ts
git commit -m "feat(ui): post-redirect toast via ?toast=<key>"
```

---

## Task 3.11: Phase-3 verification

- [ ] **Step 1: Full local check**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

All green.

- [ ] **Step 2: Mobile-viewport manual smoke**

`pnpm dev`, then in Chrome devtools at 375 × 667 (iPhone SE):

1. Bad-password login → inline error visible above the submit button without overflowing the viewport.
2. Add expense → redirected to `/`, toast slides up from bottom-center, doesn't sit over the FAB longer than 4 s.
3. Edit a category → toast appears on `/categories`.
4. Save settings → toast appears on `/settings`.
5. Trigger an unexpected error: in DevTools, throttle the network offline, then submit any mutation. Expect the form's `formError` line OR a toast (depending on the form) showing `Si è verificato un errore. Riprova.`.

- [ ] **Step 3: Open the Phase-3 PR**

Branch suggestion: `feat/toast-form-errors`. PR body lists every page+action pair migrated (six action files, four pages plus the layout-level Toaster + ToastFromQuery).

---

# Phase 4 — PWA shell (Android only)

**Outcome:** Android Chrome's "Installa l'app" menu entry installs Budget with the right icon, name, and theme color. After install, opening the icon launches the app in standalone mode.

## Task 4.1: Add `app.shortName` copy and `safe-area` utility

**Files:**
- Modify: `src/lib/copy.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the `app.shortName` copy**

```ts
app: {
  // existing keys ...
  shortName: "Budget",
},
```

- [ ] **Step 2: Add a `.safe-area` utility class**

In `src/app/globals.css`, append (in the same `@layer base` or a new `@layer utilities` block — match the file's existing convention):

```css
@layer utilities {
  .safe-area {
    padding-top: env(safe-area-inset-top);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
  }
}
```

- [ ] **Step 3: Apply to the body in `layout.tsx`**

Append `safe-area` to the body's `className`:

```tsx
<body className="min-h-full flex flex-col bg-clay-50 text-clay-900 safe-area">
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/copy.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat(pwa): app.shortName copy + safe-area utility"
```

---

## Task 4.2: Install `sharp` and `culori` as devDependencies

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install**

```bash
pnpm add -D sharp culori @types/culori
```

- [ ] **Step 2: Confirm they did not enter `dependencies`**

```bash
grep -A 5 "\"dependencies\"" package.json | grep -E "(sharp|culori)"
```

Expected: empty (both should be in `devDependencies` only).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(pwa): add sharp + culori as dev deps"
```

---

## Task 4.3: Author the source SVG icon

**Files:**
- Create: `public/icon.svg`

- [ ] **Step 1: Write the SVG**

A 512 × 512 SVG with a full-bleed `terra-500` rect (we use rect, not circle, so the maskable variant fills correctly), a centered uppercase `B` in DM Serif Display at ~62% of the canvas height, fill `clay-50`. Use the actual sRGB hex values resolved by `culori` from the OKLCH tokens (Task 4.5 has the conversion command).

Substitute the resolved hex values for `__TERRA_500_HEX__` and `__CLAY_50_HEX__` (they are computed in Step 1 of Task 4.5; the SVG stays unchanged across regenerations because the tokens haven't changed).

`public/icon.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#C36842"/>
  <text x="50%" y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="DM Serif Display, Georgia, serif"
        font-weight="400"
        font-size="320"
        fill="#F8F4EE">B</text>
</svg>
```

- [ ] **Step 2: Visual smoke**

Open `public/icon.svg` in a browser. Expect the terra rectangle with a clean "B" centered. If the glyph is mis-centered, tweak the `y` attribute (`52%` is sometimes more visually centered than `50%` depending on the font's ascent metrics). Note: at install time, browsers compose the icon. The PNG generation script is the authoritative renderer for production.

- [ ] **Step 3: Commit**

```bash
git add public/icon.svg
git commit -m "feat(pwa): source SVG for app icon"
```

---

## Task 4.4: Write the icon-generation script

**Files:**
- Create: `scripts/generate-icons.ts`

- [ ] **Step 1: Implement the script**

```ts
#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { formatHex, oklch } from "culori";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_SVG = join(ROOT, "public/icon.svg");
const OUT_DIR = join(ROOT, "public");

const TERRA_500 = formatHex(oklch({ mode: "oklch", l: 0.581, c: 0.133, h: 38 })) ?? "#C36842";
const CLAY_50  = formatHex(oklch({ mode: "oklch", l: 0.974, c: 0.010, h: 60 })) ?? "#F8F4EE";

async function makePng(size: number, name: string, opts: { background?: string } = {}) {
  const svg = await readFile(SRC_SVG);
  let img = sharp(svg, { density: 384 }).resize(size, size);
  if (opts.background) img = img.flatten({ background: opts.background });
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT_DIR, name), buf);
  console.log(`wrote ${name} (${buf.byteLength} bytes)`);
}

async function makeFavicon() {
  const svg = await readFile(SRC_SVG);
  // 32×32 ICO-equivalent PNG; Chrome/Firefox accept favicon.ico that contains a PNG.
  const png32 = await sharp(svg, { density: 96 }).resize(32, 32).png().toBuffer();
  // sharp doesn't write multi-image .ico directly; use png-to-ico if needed.
  // For our 2-user app a single 32×32 PNG renamed to .ico is widely supported.
  await writeFile(join(OUT_DIR, "favicon.ico"), png32);
  console.log(`wrote favicon.ico (${png32.byteLength} bytes)`);
}

async function main() {
  console.log(`Resolved tokens → terra-500=${TERRA_500}  clay-50=${CLAY_50}`);
  await makePng(192, "icon-192.png");                                       // any
  await makePng(512, "icon-512.png");                                       // any
  await makePng(512, "icon-mask-512.png", { background: TERRA_500 });       // maskable (no transparency)
  await makeFavicon();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add the npm script**

In `package.json`, under `scripts`:

```json
"icons": "tsx scripts/generate-icons.ts"
```

(If `tsx` is not already a devDep — check; install with `pnpm add -D tsx` if missing.)

- [ ] **Step 3: Run it**

```bash
pnpm icons
```

Expected console:

```
Resolved tokens → terra-500=#bd6840  clay-50=#f8f4ed
wrote icon-192.png (NNNN bytes)
wrote icon-512.png (NNNN bytes)
wrote icon-mask-512.png (NNNN bytes)
wrote favicon.ico (NNNN bytes)
```

(Exact hex digits may differ — `culori` is the source of truth. If they do, update the SVG's hex literals in `public/icon.svg` to match the printed values, then re-run `pnpm icons`.)

- [ ] **Step 4: Eyeball the maskable PNG**

Open `https://maskable.app/editor` in a browser. Drag `public/icon-mask-512.png` onto the page. Expect: the "B" sits well inside every preview shape (circle, squircle, rounded square). If the glyph is partially clipped, edit the SVG to scale the text down to ~58% of the canvas and re-run `pnpm icons`.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-icons.ts package.json pnpm-lock.yaml \
        public/icon-192.png public/icon-512.png public/icon-mask-512.png public/favicon.ico
git commit -m "feat(pwa): icon generation script + brand-matched PNGs and favicon"
```

(If `src/app/favicon.ico` exists in addition to `public/favicon.ico`, delete the `src/app` one — Next prefers the file under `app/` if both exist, so we keep `public/` to make ownership obvious.)

---

## Task 4.5: Write `src/app/manifest.ts`

**Files:**
- Create: `src/app/manifest.ts`

- [ ] **Step 1: Author the manifest**

```ts
import type { MetadataRoute } from "next";
import { copy } from "@/lib/copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: copy.app.title,
    short_name: copy.app.shortName,
    description: copy.app.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F4EE",   // --color-clay-50  (oklch 0.974 0.010 60)
    theme_color: "#C36842",        // --color-terra-500 (oklch 0.581 0.133 38)
    lang: "it",
    icons: [
      { src: "/icon-192.png",      sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png",      sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-mask-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

If the values printed by Task 4.4 Step 3 differ from `#F8F4EE` / `#C36842`, paste the actual values here and update the SVG identically.

- [ ] **Step 2: Smoke**

```bash
pnpm dev
curl -s http://localhost:3000/manifest.webmanifest | jq
```

Expected: a JSON document containing `name`, `theme_color`, three icons.

- [ ] **Step 3: Commit**

```bash
git add src/app/manifest.ts
git commit -m "feat(pwa): web manifest"
```

---

## Task 4.6: Add the viewport export to `layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Export viewport**

```tsx
import type { Metadata, Viewport } from "next";
// existing imports unchanged

export const viewport: Viewport = {
  themeColor: "#C36842",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: copy.app.title,
  description: copy.app.description,
  formatDetection: { telephone: false, email: false, address: false },
};
```

- [ ] **Step 2: Smoke**

```bash
pnpm dev
```

Open `/login`, view source, confirm `<meta name="theme-color" content="#C36842">` and `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(pwa): viewport metadata (theme-color, viewport-fit cover)"
```

---

## Task 4.7: Add the no-op service worker + registration

**Files:**
- Create: `public/sw.js`
- Create: `src/components/sw-register.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Author the SW**

`public/sw.js`:

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
```

- [ ] **Step 2: Author the registration component**

`src/components/sw-register.tsx`:

```tsx
"use client";
import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
```

- [ ] **Step 3: Mount in the layout**

Below `<ToastFromQuery />`:

```tsx
import { SWRegister } from "@/components/sw-register";
// ...
<ToastFromQuery />
<SWRegister />
<Toaster />
```

- [ ] **Step 4: Commit**

```bash
git add public/sw.js src/components/sw-register.tsx src/app/layout.tsx
git commit -m "feat(pwa): no-op service worker + production-only registration"
```

---

## Task 4.8: E2E for manifest + meta + missing apple

**Files:**
- Create: `tests/e2e/pwa.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from "@playwright/test";

test("manifest.webmanifest has the expected shape", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.name).toBe("Budget");
  expect(json.short_name).toBe("Budget");
  expect(json.start_url).toBe("/");
  expect(json.display).toBe("standalone");
  expect(json.theme_color).toBe("#C36842");
  expect(json.icons).toHaveLength(3);
  expect(json.icons.map((i: { sizes: string }) => i.sizes).sort()).toEqual([
    "192x192", "512x512", "512x512",
  ]);
});

test("layout HEAD has theme-color and no apple-touch-icon", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#C36842");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(0);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e tests/e2e/pwa.spec.ts
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/pwa.spec.ts
git commit -m "test(e2e): pwa manifest + meta tags"
```

---

## Task 4.9: Update `docs/deploy.md` with install instructions

**Files:**
- Modify: `docs/deploy.md`

- [ ] **Step 1: Append a new "Installing the PWA" section after the smoke-test section (currently §4)**

```markdown
## 5. Installing the PWA on Android

After the first deploy that includes the manifest:

1. Open the production URL in **Chrome on Android**.
2. Tap the address bar's "**Installa**" badge if Chrome surfaces one, OR open the triple-dot menu → **Installa l'app**.
3. The app appears on the home screen with the "Budget" name and the terracotta "B" icon.
4. Launching the icon opens the app in standalone mode (no Chrome chrome).

Repeat for both spouses. iOS is not supported in this version.
```

(Renumber any subsequent sections accordingly.)

- [ ] **Step 2: Commit**

```bash
git add docs/deploy.md
git commit -m "docs(deploy): Android install instructions for PWA"
```

---

## Task 4.10: Phase-4 verification

- [ ] **Step 1: Local check**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

All green.

- [ ] **Step 2: Production smoke after merge**

After the Phase-4 PR ships and Vercel redeploys, on each spouse's Android phone:

1. Open the production URL in Chrome.
2. Confirm the address bar's install affordance OR the menu's "Installa l'app" entry.
3. Install. Confirm the icon on the home screen matches the brand.
4. Launch. Confirm standalone chrome (no URL bar).
5. Sign in, add an expense, see the toast — full path from Phases 1-3 still works.

- [ ] **Step 3: Open the Phase-4 PR**

Branch suggestion: `feat/pwa-shell-android`. Body lists the manifest, three PNGs, the SW, and the install steps in `deploy.md`.

---

# Phase 5 — Accessibility quick wins

**Outcome:** Every interactive element has a visible focus ring, motion respects `prefers-reduced-motion`, every icon-only button has an `aria-label`, and no tap target is < 44 × 44 px on the mobile viewport. Then `ROADMAP.md` is updated to mark Plan 3 ✅.

## Task 5.1: Add focus-visible base styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append to `@layer base`**

```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--color-terra-500);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  :focus:not(:focus-visible) {
    outline: none;
  }
}
```

- [ ] **Step 2: Smoke pass**

`pnpm dev`. Tab through `/login`, `/`, `/expenses/new`, `/categories`, `/settings`, `/import`. Confirm a clearly visible terra ring around every focused element.

For any element where the ring clashes (terra ring on terra background — likely the FAB on `/`), add `data-focus-ring="contrast"` to that element's JSX and a corresponding override in `globals.css`:

```css
@layer base {
  [data-focus-ring="contrast"]:focus-visible {
    outline-color: var(--color-clay-50);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/...  # any files where data-focus-ring="contrast" was added
git commit -m "feat(a11y): focus-visible ring + contrast override hook"
```

---

## Task 5.2: Honor `prefers-reduced-motion`

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append at the bottom of the file**

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

- [ ] **Step 2: E2E asserting motion is suppressed**

`tests/e2e/reduced-motion.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("animations are suppressed under prefers-reduced-motion", async ({ page }) => {
  await page.goto("/login");
  const button = page.getByRole("button", { name: /accedi/i });
  const transition = await button.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(transition).toMatch(/^0(\.0+)?(ms|s)$/);
});
```

- [ ] **Step 3: Run**

```bash
pnpm test:e2e tests/e2e/reduced-motion.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tests/e2e/reduced-motion.spec.ts
git commit -m "feat(a11y): respect prefers-reduced-motion"
```

---

## Task 5.3: ARIA labels on icon-only buttons

**Files:**
- Modify: `src/lib/copy.ts`
- Modify: `src/app/...` (every component matching the survey below)

- [ ] **Step 1: Survey**

```bash
grep -rn "<button" src/app src/components 2>/dev/null \
  | grep -v "aria-label" \
  | grep -E "(<Plus|<X|<ChevronLeft|<ChevronRight|<Trash|<Pencil|<MoreHorizontal)"
```

Capture the file:line list. Expect ~6–10 hits (FAB, drawer close ×, back link, mapping edit/delete, import row toggle, etc.).

- [ ] **Step 2: Add a `copy.a11y` namespace**

```ts
a11y: {
  add: "Aggiungi",
  close: "Chiudi",
  back: "Indietro",
  edit: "Modifica",
  delete: "Elimina",
  more: "Altre opzioni",
  toggleRow: "Includi/escludi questa riga",
},
```

- [ ] **Step 3: Add `aria-label` to each surveyed button**

For each hit from Step 1, edit the JSX so the `<button>` carries `aria-label={copy.a11y.<key>}`. The existing on-button text (none, since they're icon-only) is unchanged.

- [ ] **Step 4: Smoke with VoiceOver / TalkBack mental model**

`pnpm dev`. In Chrome, open the Accessibility tab in DevTools, focus each icon-only button, confirm the "Name" field shows the Italian label.

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy.ts src/app src/components
git commit -m "feat(a11y): aria-labels on icon-only buttons"
```

---

## Task 5.4: Tap-target spot-check

**Files:**
- Modify: any component where a tap target measures < 44 × 44 px

- [ ] **Step 1: Survey at 375 × 667**

`pnpm dev`, open Chrome devtools at iPhone-SE-2nd dimensions. Use the inspector to measure each interactive element's bounding box. List anything below 44 × 44 px.

Expected suspects: drawer close ×, mapping list edit icons, import row toggle (when icon-only).

- [ ] **Step 2: Apply the fix**

For each, add Tailwind utilities `min-h-11 min-w-11` (11 × 4 = 44 px) and `inline-flex items-center justify-center` if the icon needs centering. Do not invent new spacing tokens.

- [ ] **Step 3: Re-measure**

Confirm every element now ≥ 44 × 44 px. Note: the visual icon size stays the same; only the touch box grows.

- [ ] **Step 4: Commit**

```bash
git add src/app src/components
git commit -m "feat(a11y): enforce 44×44 px minimum tap targets"
```

---

## Task 5.5: E2E for focus-ring presence

**Files:**
- Create: `tests/e2e/focus-ring.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from "@playwright/test";

test("Tab reveals a focus ring on the email input", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const style = getComputedStyle(el);
    return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle };
  });
  expect(focused?.outlineStyle).toBe("solid");
  expect(focused?.outlineWidth).toBe("2px");
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e tests/e2e/focus-ring.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/focus-ring.spec.ts
git commit -m "test(e2e): focus-visible ring on /login"
```

---

## Task 5.6: Final Phase-5 verification

- [ ] **Step 1: Full suite**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm audit --prod
```

All green.

- [ ] **Step 2: Manual mobile smoke (375 × 667)**

Walk every page (`/login`, `/`, `/expenses/new`, `/categories`, `/settings`, `/settings/mappings`, `/import`, `/trends`). For each:
- Tab through every focusable element. Confirm the ring is visible everywhere.
- Tap every icon-only button. Confirm hits land cleanly (no near-misses).
- Confirm no animation plays under `prefers-reduced-motion: reduce` (Chrome devtools "Emulate CSS media feature: prefers-reduced-motion").

- [ ] **Step 3: Open the Phase-5 PR**

Branch suggestion: `feat/a11y-quickwins`.

---

## Task 5.7: Mark Plan 3 complete in `ROADMAP.md`

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Update the table**

```markdown
| 3 | ✅ Shipped | PWA shell + production hardening | [`2026-04-30-budget-pwa-hardening.md`](superpowers/plans/2026-04-30-budget-pwa-hardening.md) |
```

- [ ] **Step 2: Append a "Plan 3 — shipped" section after the existing Plan-2 section**

Mirror the existing "Plan 1 — MVP (shipped …)" structure: goal recap, "Delivered:" bullet list (one bullet per workstream), one line about anything explicitly deferred.

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): mark Plan 3 shipped"
```

This is the closing commit of the plan. Open it as part of the Phase-5 PR (or as a tiny follow-up doc PR — both fine).

---

## Final state

After all five PRs merge:

- `/signup` is unreachable in production via three independent guards. Both production accounts already exist; if a third is ever needed, see `docs/deploy.md` §6 for the manual Studio path.
- Every Server Action returns `ActionResult` and surfaces failures inline or via toast. No silent failures remain.
- The app installs as an Android PWA with brand icon and theme color. Standalone launch works.
- Every focusable element has a visible ring. Motion is suppressed under user preference. Every icon-only button has a label.
- A strict per-request CSP (with `strict-dynamic` + nonce) protects against script injection. Four supporting headers protect against framing, MIME sniffing, referer leaks, and unwanted device APIs. The Dependabot alert is closed.

`ROADMAP.md` next steps section is empty after Plan 3 ships — Plan 4 (if any) starts with a fresh brainstorming session.
