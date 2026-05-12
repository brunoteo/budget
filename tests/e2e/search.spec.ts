import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("search: open from kebab, filter by text, edit row, return to /search", async ({ page }) => {
  const email = `e2e-search+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  await page.goto("/categories");
  await page.fill("[name=name]", "Spesa");
  await page.fill("[name=expectedAmount]", "100");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Spesa")).toBeVisible();

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "12.50");
  await page.selectOption("[name=categoryId]", { label: "Spesa" });
  await page.fill("[name=note]", "Esselunga");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  await page.getByLabel(/Menù|Menu/).click();
  await page.getByRole("menuitem", { name: "Ricerca" }).click();
  await expect(page).toHaveURL(/\/search/);
  await expect(page.getByPlaceholder(/Cerca in note/)).toBeVisible();

  await page.getByPlaceholder(/Cerca in note/).fill("esselunga");
  await page.waitForURL(/\/search\?.*q=esselunga/);
  await expect(page.getByText("Esselunga")).toBeVisible();

  const firstRow = page.locator("a[href^='/expenses/']").first();
  await firstRow.click();
  await expect(page).toHaveURL(/\/expenses\/.*\/edit\?return=/);

  await page.getByRole("link", { name: /Annulla/i }).click();
  await expect(page).toHaveURL(/\/search\?.*q=esselunga/);
});
