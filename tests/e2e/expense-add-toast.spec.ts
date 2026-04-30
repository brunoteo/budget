import { test, expect } from "@playwright/test";

test("adding an expense fires the success toast on the dashboard", async ({ page }) => {
  // assumes the golden-path test setup left a logged-in user with at least one category
  await page.goto("/");
  // The dashboard FAB or "aggiungi" link routes to /expenses/new
  await page.getByRole("link", { name: /aggiungi/i }).first().click();
  await page.getByLabel(/importo/i).fill("12,50");
  await page.getByLabel(/categoria/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /salva/i }).click();
  await expect(page.getByText(/spesa aggiunta/i)).toBeVisible();
});
