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
