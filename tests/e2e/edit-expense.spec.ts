import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("edit transaction: change amount and note, see updated totals", async ({ page }) => {
  const email = `e2e-edit+${Date.now()}@test.local`;

  // Sign up
  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // Create category
  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "20");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Carburante")).toBeVisible();

  // Create expense
  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "50.00");
  await page.selectOption("[name=categoryId]", { label: "Carburante" });
  await page.fill("[name=note]", "Pieno");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/€\s*50,00/).first()).toBeVisible();

  // Expand category, tap the transaction row
  await page.getByRole("button", { name: /Carburante/ }).click();
  await page.getByRole("link", { name: /Pieno/ }).click();

  // Edit page
  await expect(page.getByRole("heading", { name: "Modifica spesa" })).toBeVisible();
  await page.fill("[name=amount]", "75.50");
  await page.fill("[name=note]", "Pieno aggiornato");
  await page.getByRole("button", { name: "Aggiorna" }).click();

  // Back on dashboard, see new total + toast
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByText(/spesa aggiornata/i)).toBeVisible();
  await expect(page.getByText(/€\s*75,50/).first()).toBeVisible();
});
