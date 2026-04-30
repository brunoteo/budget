import { test, expect } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("animations are suppressed under prefers-reduced-motion", async ({ page }) => {
  await page.goto("/login");
  const button = page.getByRole("button", { name: /accedi/i });
  const transition = await button.evaluate((el) => getComputedStyle(el).transitionDuration);
  // Browser may return "0s", "0ms", "0.00001s", "1e-05s" etc. — all mean ~0
  const seconds = parseFloat(transition);
  expect(seconds).toBeLessThan(0.001);
});
