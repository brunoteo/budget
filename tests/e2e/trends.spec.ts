import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("trends page renders sections after the dashboard creates a cycle", async ({ page }) => {
  const email = `trends+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Trender");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "1");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  await page.goto("/categories");
  await page.fill("[name=name]", "Spese casa");
  await page.fill("[name=expectedAmount]", "500");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Spese casa")).toBeVisible();

  await page.goto("/expenses/new");
  await page.fill("[name=amount]", "100");
  await page.selectOption("[name=categoryId]", { label: "Spese casa" });
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // The "Andamento" icon button is rendered as a Link with aria-label set
  // to copy.trends.headerLink ("Andamento"). Tap it directly — no dropdown.
  await page.getByRole("link", { name: "Andamento" }).first().click();
  await expect(page).toHaveURL(/\/trends$/);

  // Annual group is always rendered when at least one cycle exists.
  await expect(page.getByRole("heading", { name: "Quest'anno" })).toBeVisible();
  await expect(page.getByText(/Ultimi \d+ cicli/i)).toBeVisible();

  // With only one cycle, the monthly group hides and the "Disponibile dal secondo ciclo" hint is shown.
  await expect(page.getByText(/Disponibile dal secondo ciclo/i)).toBeVisible();
});
