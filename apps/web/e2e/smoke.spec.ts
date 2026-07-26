import { test, expect } from "./fixtures";

/**
 * Harness smoke test: the saved auth session works and the /app shell renders.
 * If this fails, the problem is auth.setup or the dev server — not a flow spec.
 */
test("authenticated /app shell renders", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app/);
  // The global search trigger sits in the app header on every /app page.
  await expect(
    page.getByRole("button", { name: /Search your network/i }),
  ).toBeVisible({ timeout: 30_000 });
});
