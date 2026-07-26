import { test, expect } from "./fixtures";

/**
 * The confirmations inbox (/app/confirmations) — doubts the extractor raised
 * before writing to the graph. On a local dev server there are usually no
 * pending confirmations, so the empty state ("Nothing to confirm") is the
 * expected pass; when cards do exist (a seeded/hosted account) we assert a card
 * and, best-effort, that dismissing one removes it. Both branches pass.
 *
 * Selectors (verified from ConfirmationsInbox / card sources):
 * - Heading: getByRole("heading", { name: "Confirmations" }).
 * - Empty state: text "Nothing to confirm".
 * - Card actions: "Add to contact" / "Dismiss" / "Yes, that's them" /
 *   "No, remove it". Dismiss resolves via a server action + revalidation, so the
 *   dismissed card drops out of the re-rendered inbox.
 */
test("confirmations inbox renders", async ({ page }) => {
  await page.goto("/app/confirmations", { timeout: 60_000 });

  await expect(
    page.getByRole("heading", { name: "Confirmations" }),
  ).toBeVisible({ timeout: 60_000 });

  const emptyState = page.getByText("Nothing to confirm");
  const cardAction = page.getByRole("button", {
    name: /Add to contact|Dismiss|Yes, that|No, remove/i,
  });

  // Exactly one branch renders: the empty state XOR one or more cards.
  await expect(emptyState.or(cardAction.first())).toBeVisible({ timeout: 30_000 });

  // If cards are present, dismissing the first should drop it (the inbox
  // revalidates without it). Guarded so the empty-state run just no-ops here.
  const dismiss = page.getByRole("button", { name: /^Dismiss$/i });
  if (await dismiss.first().isVisible().catch(() => false)) {
    const before = await dismiss.count();
    await dismiss.first().click();
    await expect(dismiss).toHaveCount(before - 1, { timeout: 30_000 });
  }
});
