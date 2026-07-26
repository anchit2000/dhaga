import { test, expect } from "./fixtures";

/**
 * The referral page (/app/referral). ReferralPanel only renders when
 * loadReferralInfo returns data (an EE/hosted concern); a plain local instance
 * shows the "Referrals aren't available on this instance." notice instead. Both
 * are valid — assert the heading, then whichever branch rendered.
 *
 * Selectors (verified from referral page / ReferralPanel sources):
 * - Heading: getByRole("heading", { name: "Refer a friend" }).
 * - Panel present: "Your invite link" label + a <code> invite URL.
 * - Unavailable: "Referrals aren't available on this instance." — the source
 *   uses a curly apostrophe (’), so match with a regex whose "." tolerates the
 *   quote character.
 */
test("referral page renders (panel or unavailable notice)", async ({ page }) => {
  await page.goto("/app/referral", { timeout: 60_000 });

  await expect(
    page.getByRole("heading", { name: "Refer a friend" }),
  ).toBeVisible({ timeout: 60_000 });

  const unavailable = page.getByText(/Referrals aren.t available on this instance/i);
  const inviteLabel = page.getByText("Your invite link");

  // Panel XOR notice — one of the two always renders.
  await expect(unavailable.or(inviteLabel)).toBeVisible({ timeout: 30_000 });

  // When the panel is present, the invite link must show a non-empty code/URL.
  if (await inviteLabel.isVisible().catch(() => false)) {
    await expect(page.locator("code").first()).toHaveText(/\S/, { timeout: 15_000 });
  }
});
