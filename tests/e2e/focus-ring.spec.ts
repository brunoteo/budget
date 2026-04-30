import { test, expect } from "@playwright/test";

test("Tab reveals a focus ring on the email input", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const style = getComputedStyle(el);
    return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle };
  });
  expect(focused?.outlineStyle).toBe("solid");
  expect(focused?.outlineWidth).toBe("2px");
});
