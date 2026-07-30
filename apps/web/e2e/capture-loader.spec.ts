import { test, expect } from "./fixtures";

/**
 * The card scan must show a blocking, branded overlay for as long as the AI is
 * working — and must clear it afterwards.
 *
 * This is a regression test for a bug that shipped twice. A Server Action
 * re-suspends home's `<Suspense fallback={null}><HomeDock/></Suspense>` for the
 * whole call; React hides that boundary's committed DOM (portals included) and
 * nothing queued behind the suspended transition can commit, so any spinner
 * rendered by the capture form itself is invisible exactly when it is needed —
 * the screen just goes blank until the contact appears. The overlay therefore
 * lives in the app shell, above every page Suspense (see BusyOverlay), and this
 * spec fails if it is ever moved back inside one.
 *
 * The scan response is held open so the in-flight window is observable at all;
 * without that it is over in a few hundred ms.
 */

// A 1x1 JPEG: enough to reach the action, no fixture file needed. What comes
// back does not matter — the overlay's lifecycle is what is under test.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
    "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

/** The app-shell scrim: fixed, above the dialogs it covers. */
const SCRIM = '[class*="z-[60]"]';

test("a card scan blocks the screen with the branded loader until it settles", async ({ page }) => {
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let heldOnce = false;

  await page.route("**/app", async (route) => {
    // Hold only the scan submit, not the tour/onboarding actions that also POST.
    if (route.request().method() === "POST" && !heldOnce) {
      heldOnce = true;
      await held;
    }
    await route.continue();
  });

  await page.goto("/app");
  // The first-run tour overlay intercepts clicks on a fresh account.
  await page
    .locator(".driver-overlay, .driver-popover")
    .first()
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(async () => {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1_000);
    })
    .catch(() => {});

  // Dock → capture dialog (opens on the Manual hub) → the AI pills → Card photo.
  await page.getByRole("button", { name: "Capture", exact: true }).click();
  await page.getByRole("button", { name: /Back to capture/ }).click();
  await page.getByRole("button", { name: "Card photo" }).click();
  await page
    .locator('input[type="file"][name="photo"]')
    .first()
    .setInputFiles({ name: "card.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });

  await expect(page.getByRole("button", { name: /^Scan card$/ })).toBeVisible();
  await page.getByRole("button", { name: /^Scan card$/ }).click();

  // In flight: the scrim covers the viewport and carries the scan's status copy.
  const scrim = page.locator(SCRIM);
  await expect(scrim).toBeVisible({ timeout: 10_000 });
  await expect(scrim).toContainText(/Reading the card|Making out the details/);
  const box = await scrim.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1);
  expect(box?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);

  // It must still be up a beat later — the bug was a scrim that never showed,
  // and the first fix was one that tore itself down mid-scan.
  await page.waitForTimeout(3_000);
  await expect(scrim).toBeVisible();

  release?.();

  // Settled: the scrim clears, whatever the scan returned.
  await expect(scrim).toBeHidden({ timeout: 30_000 });
});
