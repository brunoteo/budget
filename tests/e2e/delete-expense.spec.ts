import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("delete transaction: confirm dialog, row removed, toast shown", async ({ page }) => {
  const email = `e2e-del+${Date.now()}@test.local`;

  // Sign up
  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // Category + expense
  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "20");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Carburante")).toBeVisible();

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "33.33");
  await page.selectOption("[name=categoryId]", { label: "Carburante" });
  await page.fill("[name=note]", "Da cancellare");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // Navigate to edit
  await page.getByRole("button", { name: /Carburante/ }).click();
  await page.getByRole("link", { name: /Da cancellare/ }).click();
  await expect(page.getByRole("heading", { name: "Modifica spesa" })).toBeVisible();

  // Accept the native confirm
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Elimina" }).click();

  // Back on dashboard, no row + toast
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByText(/spesa rimossa/i)).toBeVisible();
  await expect(page.getByText("Da cancellare")).toHaveCount(0);
});
