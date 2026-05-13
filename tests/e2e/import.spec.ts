import { test, expect } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.resolve(__dirname, "../fixtures/wallet/sample.csv");

test.use({ viewport: { width: 375, height: 812 } });
test.setTimeout(90_000);

test("wallet csv import: upload → resolve → commit → banner", async ({ page }) => {
  const email = `e2e-import+${Date.now()}@test.local`;

  // 1. Signup with cycleStartDay=20 so the current cycle (Apr 20 → May 19) contains
  //    both today (May 2026) and the April-dated fixture rows in a single window.
  await page.goto("/signup");
  await page.fill("[name=displayName]", "Tester");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", "Password!1");
  await page.fill("[name=cycleStartDay]", "20");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");

  // 2. Add a Carburante category to the current cycle.
  await page.goto("/categories");
  await page.fill("[name=name]", "Carburante");
  await page.fill("[name=expectedAmount]", "200");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Carburante")).toBeVisible();

  // 3. Visit /import.
  await page.goto("/import");
  // 3a. Empty state of the last-import banner is visible on first visit.
  await expect(page.getByText("Nessun import precedente. Esporta tutto lo storico da Wallet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Importa da Wallet" })).toBeVisible();

  // 4. Upload the fixture (input is hidden but reachable via setInputFiles).
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  // 5. Staging UI shown — fixture yields 7 kept rows after filtering 1 Entrate + 1 transfer.
  await expect(page.getByText(/spese da Wallet/)).toBeVisible();
  await expect(page.getByText("DA IMPORTARE")).toBeVisible();

  // 6+7. Resolve every unmapped row by clicking its trigger and selecting "Carburante".
  // Within-batch propagation auto-fills sibling rows that share a wallet category,
  // so 5 unique wallet categories => ~5 drawer interactions.
  // The Drawer (Vaul) does NOT auto-close on item click — we press Escape after each
  // selection to dismiss the overlay before the next trigger can be clicked.
  const unmappedTriggers = page.locator('button:has-text("Scegli categoria…")');
  const overlay = page.locator('[data-slot="drawer-overlay"]');
  for (let i = 0; i < 10; i++) {
    const remaining = await unmappedTriggers.count();
    if (remaining === 0) break;
    await unmappedTriggers.first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("button", { name: "Carburante" }).click();
    // Close the drawer (Vaul keeps it open after item click) and wait for overlay teardown.
    await page.keyboard.press("Escape");
    await overlay.waitFor({ state: "detached", timeout: 5000 }).catch(() => undefined);
    // Confirm progress (propagation may resolve >1 row in one click).
    await expect
      .poll(() => unmappedTriggers.count(), { timeout: 5000 })
      .toBeLessThan(remaining);
  }

  // 8. Commit.
  const commit = page.getByRole("button", { name: /^Importa\s/ });
  await expect(commit).toBeEnabled();
  await commit.click();

  // 9. Success.
  await expect(page.getByRole("heading", { name: "Spese annotate" })).toBeVisible({ timeout: 5000 });

  // 10. After committing the import, banner shows the latest imported date.
  await page.goto("/import");
  await expect(page.getByText(/Ultima transazione importata:/)).toBeVisible();
  await expect(page.getByText(/Esporta da Wallet dal/)).toBeVisible();
});
