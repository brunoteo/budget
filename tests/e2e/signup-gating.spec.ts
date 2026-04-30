import { test, expect } from "@playwright/test";

const flag = process.env.NEXT_PUBLIC_ALLOW_SIGNUP;

test.describe("signup gating", () => {
  test.skip(flag !== "true", "covers the dev-mode path; see deploy.md for prod expectation");

  test("allows reaching the signup form when flag is true", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("button", { name: /crea account/i })).toBeVisible();
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
