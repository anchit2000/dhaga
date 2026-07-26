import { test, expect } from "./fixtures";
import { createContact, uniqueName } from "./helpers";
import type { Page } from "@playwright/test";

/**
 * Follow-up flows. Follow-ups are ADDED on a contact's detail page (optimistic,
 * per PR #94-era useOptimisticList) and LISTED / completed / dismissed on
 * `/app/follow-ups`. Complete + dismiss are also optimistic (PR #94): the row
 * clears instantly, then the server action commits in the background.
 */

/**
 * Add a follow-up from the contact detail page and wait until it is committed
 * server-side. The manual add shows the row optimistically, then POSTs the
 * server action to the contact route in the background; we wait for that POST
 * so a follow-up is really persisted before any navigation to /app/follow-ups.
 */
async function addFollowUp(page: Page, action: string): Promise<void> {
  const trigger = page.getByRole("button", { name: "Add follow-up" });
  await expect(trigger).toBeVisible({ timeout: 60_000 });
  await trigger.click();
  await page.getByPlaceholder("What to do").fill(action);

  const saved = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" && res.url().includes("/app/people/") && res.ok(),
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: /^Add$/ }).click();

  // Optimistic: the row appears well before the round-trip finishes.
  await expect(page.getByText(action)).toBeVisible({ timeout: 2_000 });
  await saved;
}

test.describe("follow-ups", () => {
  test("add a follow-up on the contact page (optimistic)", async ({ page }) => {
    await createContact(page, { name: uniqueName("Reminder") });
    // createContact leaves us on the new contact's detail page.
    await addFollowUp(page, uniqueName("call"));
  });

  test("complete a follow-up from /app/follow-ups", async ({ page }) => {
    const action = uniqueName("call");
    await createContact(page, { name: uniqueName("Followee") });
    await addFollowUp(page, action);

    await page.goto("/app/follow-ups");
    const row = page.getByRole("listitem").filter({ hasText: action });
    await expect(row).toBeVisible({ timeout: 60_000 });

    // Optimistic complete (PR #94): the row clears instantly.
    await row.getByRole("button", { name: "Mark done" }).click();
    await expect(page.getByText(action)).toHaveCount(0, { timeout: 10_000 });
  });

  test("dismiss a follow-up from /app/follow-ups", async ({ page }) => {
    const action = uniqueName("email");
    await createContact(page, { name: uniqueName("Dismissee") });
    await addFollowUp(page, action);

    await page.goto("/app/follow-ups");
    const row = page.getByRole("listitem").filter({ hasText: action });
    await expect(row).toBeVisible({ timeout: 60_000 });

    // Optimistic dismiss (PR #94): the row is removed instantly.
    await row.getByRole("button", { name: "Dismiss follow-up" }).click();
    await expect(page.getByText(action)).toHaveCount(0, { timeout: 10_000 });
  });
});
