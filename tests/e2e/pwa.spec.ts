import { test, expect } from "@playwright/test";

test("manifest.webmanifest has the expected shape", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.name).toBe("Budget");
  expect(json.short_name).toBe("Budget");
  expect(json.start_url).toBe("/");
  expect(json.display).toBe("standalone");
  expect(json.theme_color).toBe("#bb5a3c");
  expect(json.icons).toHaveLength(3);
  expect(json.icons.map((i: { sizes: string }) => i.sizes).sort()).toEqual([
    "192x192", "512x512", "512x512",
  ]);
});

test("layout HEAD has theme-color and no apple-touch-icon", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#bb5a3c");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(0);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveCount(0);
});
