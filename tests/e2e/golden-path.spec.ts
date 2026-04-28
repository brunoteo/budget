import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("golden path: signup → categories → expense → KPI", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "27");
  await page.click("button[type=submit]");

  await expect(page).toHaveURL("/");

  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "20");
  // Click the "Aggiungi" submit button inside the category editor form (not the carry-forward button)
  await page.getByRole("button", { name: "Aggiungi" }).click();

  // After redirect from createCategoryAction, the category should appear in the list
  await expect(page.getByText("Carburante")).toBeVisible();

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "83.83");
  await page.selectOption("[name=categoryId]", { label: "Carburante" });
  await page.fill("[name=note]", "Benzina");
  await page.click("button[type=submit]");

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Carburante")).toBeVisible();
  await expect(page.getByText(/€\s*83,83/).first()).toBeVisible();
});
