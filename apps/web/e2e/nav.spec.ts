import { test, expect } from "./fixtures";

/**
 * Regression guard for the mobile-nav congestion fix.
 *
 * WHY: at 375px the primary nav used to pack the brand wordmark + three
 * full-text pills ("Home", "Confirmations", "Graph") into a row that only
 * `overflow-x-auto` kept from breaking the layout — so it silently became a
 * horizontal-scroll region (scrollWidth ≫ clientWidth) and the later pills were
 * unreachable without scrolling. The pills now collapse to icons below `sm`, so
 * the row MUST fit with zero hidden overflow while staying a real touch target.
 * A change that reintroduces the overflow (e.g. dropping the icon-only collapse
 * or re-adding a wide label on mobile) must fail here.
 */
test("app nav pill row fits with no hidden overflow at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/app");
  await expect(
    page.getByRole("button", { name: /Search your network/i }),
  ).toBeVisible({ timeout: 30_000 });

  const nav = page.locator("header nav").first();
  const { scrollWidth, clientWidth } = await nav.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  // Everything the row contains is visible — no silent horizontal-scroll region.
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // Icon-only on mobile, but each pill must keep its accessible name and stay a
  // ≥44×44px touch target.
  const home = page.getByRole("link", { name: "Home" });
  await expect(home).toBeVisible();
  const box = await home.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});
