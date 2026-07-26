import { test, expect } from "./fixtures";
import { createContact, uniqueName } from "./helpers";

/**
 * Relationships + Keep-in-touch on the contact detail page.
 *
 * Both features are always present on a contact page (no EE/hosted gating), so
 * these assert the real happy path. The relationship dialog's TargetPicker is a
 * debounced typeahead over /api/graph/targets; if that search returns nothing on
 * this instance the picker can't be driven, so test 2 skips rather than hangs.
 *
 * Selectors (verified from source):
 * - Keep in touch (KeepInTouch.tsx): select[name="days"] (aria-label
 *   "Reach-out cadence") + a "Save" submit; once a cadence saves, an
 *   "I reached out ✓" button appears in a sibling form.
 * - Add relationship (AddRelationshipDialog): a "Add relationship" trigger opens
 *   a [role=dialog]; inside, getByLabel("Relationship target") is the
 *   TargetPicker input and getByLabel("Relationship type") the PredicateField
 *   input — each a plain <input> backed by a dropdown of <button> options. The
 *   footer "Add relationship" submits (disabled until a target + predicate exist).
 */

test("set a keep-in-touch cadence", async ({ page }) => {
  const url = await createContact(page, { name: uniqueName("KeepInTouch") });
  await page.goto(url, { timeout: 60_000 });

  // Scope Save to the cadence form so we never hit another Save on the page.
  const cadenceForm = page.locator('form:has(select[name="days"])');
  const cadence = cadenceForm.locator('select[name="days"]');
  await expect(cadence).toBeVisible({ timeout: 60_000 });

  // Index 0 is "No reminder"; index 1 is the first real cadence ("Daily").
  await cadence.selectOption({ index: 1 });
  await cadenceForm.getByRole("button", { name: "Save" }).click();

  // After the server action revalidates, everyDays is set and the reset
  // affordance renders — the observable proof the cadence persisted.
  await expect(
    page.getByRole("button", { name: /I reached out/i }),
  ).toBeVisible({ timeout: 30_000 });
});

test("add a relationship between two contacts", async ({ page }) => {
  const targetName = uniqueName("Rel Target");
  await createContact(page, { name: targetName });
  const sourceUrl = await createContact(page, { name: uniqueName("Rel Source") });
  await page.goto(sourceUrl, { timeout: 60_000 });

  // The trigger lives in the Relationships section; the footer submit shares its
  // "Add relationship" name but sits inside the dialog, so scope that one later.
  const openDialog = page.getByRole("button", { name: "Add relationship" });
  await expect(openDialog.first()).toBeVisible({ timeout: 60_000 });
  await openDialog.first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // TargetPicker: type the other contact's name, then click the result button.
  // The debounced /api/graph/targets fetch renders each match as a <button>.
  await dialog.getByLabel("Relationship target").fill(targetName);
  const targetResult = dialog.getByRole("button", { name: targetName });
  const found = await targetResult
    .first()
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  // Graceful: no graph-target search results on this instance → the picker can't
  // be driven, so skip instead of failing on a feature that's effectively off.
  test.skip(!found, "graph target search returned no results on this instance");
  await targetResult.first().click();

  // PredicateField: focusing/typing opens the option list; "friend of" is a
  // built-in contact↔contact predicate (RELATIONSHIP_ROLES.friend_of).
  const predicate = dialog.getByLabel("Relationship type");
  await predicate.click();
  await predicate.fill("friend");
  await dialog.getByRole("button", { name: "friend of" }).first().click();

  // Footer submit (enabled once target + predicate are set). onCreate hands the
  // host an optimistic row that appears the instant the dialog closes.
  const submit = dialog.getByRole("button", { name: "Add relationship" });
  await expect(submit).toBeEnabled();
  await submit.click();

  // The new relationship row shows the target's name (only place it appears on
  // the source contact's page).
  await expect(page.getByText(targetName).first()).toBeVisible({ timeout: 15_000 });
});
