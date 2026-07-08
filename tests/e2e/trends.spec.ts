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

  // No salary was ever set for this cycle — the new chart shows its placeholder, not a chart.
  await expect(page.getByRole("heading", { name: "% stipendio speso" })).toBeVisible();
  await expect(page.getByText(/Nessun dato stipendio disponibile/i)).toBeVisible();
});

test("trends page shows the % stipendio speso chart once a salary is set", async ({ page }) => {
  const email = `trends-salary+${Date.now()}@test.local`;

  await page.goto("/signup");
  await page.fill("[name=displayName]", "Salaried");
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

  await page.goto("/settings");
  const salaryForm = page.locator("form", { has: page.locator("input[name=salary]") });
  await salaryForm.locator("input[name=salary]").fill("2000");
  await salaryForm.getByRole("button", { name: "Salva" }).click();
  // Wait for the post-save toast (confirms the redirect + revalidation round-trip
  // actually completed) before navigating away — matches the toast-assertion
  // convention used in edit-expense.spec.ts / delete-expense.spec.ts.
  await expect(page.getByText("Impostazioni salvate")).toBeVisible();
  await expect(salaryForm.locator("input[name=salary]")).toHaveValue("2000");

  await page.goto("/trends");
  await expect(page.getByRole("heading", { name: "% stipendio speso" })).toBeVisible();
  // The SSR read backing /trends can intermittently lag behind a salary write that
  // just committed (local Supabase/pooler read-after-write consistency lag, not an
  // app bug) — poll with a bounded reload rather than asserting on the first render.
  await expect(async () => {
    const stillNoData = await page.getByText(/Nessun dato stipendio disponibile/i).isVisible();
    if (stillNoData) {
      await page.reload();
      throw new Error("salary data not yet visible, retrying");
    }
  }).toPass({ timeout: 10_000 });
});
