import { test, expect } from "./fixtures";
import { createContact, uniqueName } from "./helpers";

/**
 * Manual facts on the contact detail page (M4 + PR #94 optimistic add).
 *
 * Selectors (verified against AddFactForm / FactListClient):
 * - Collapsed trigger: button "Add fact". Clicking it swaps the button for an
 *   inline form, so the trigger and the form's submit share the "Add fact"
 *   label but never coexist — target the submit with `.last()` to be safe.
 * - Fact text: `input[name="text"]` (placeholder "A fact about them").
 * - Fact type: native `select[name="type"]` (aria-label "Fact type"), defaults
 *   to "personal"; other types are extra <option>s.
 * - A saved fact renders its text in a FactItem <p>; the add is optimistic
 *   (useOptimisticList), so the text paints before the server write returns.
 */
test("add a fact to a contact (optimistic, PR #94)", async ({ page }) => {
  await createContact(page, { name: uniqueName("Fact Friend") });
  // createContact leaves us on the new contact's detail page.

  // Expand the manual add-fact form.
  await page.getByRole("button", { name: "Add fact" }).click();

  const factText = uniqueName("likes coffee");
  await page.locator('input[name="text"]').fill(factText);

  // Pick a non-default fact type when the select exposes more than one option.
  const typeSelect = page.locator('select[name="type"]');
  if ((await typeSelect.locator("option").count()) > 1) {
    await typeSelect.selectOption({ index: 1 });
  }

  // The expanded submit shares the "Add fact" label with the (now-replaced)
  // trigger; `.last()` targets the form's submit button.
  await page.getByRole("button", { name: "Add fact" }).last().click();

  // Optimistic insert (PR #94): the fact text must paint fast, before the
  // server write + router.refresh reconcile it — a plain server round-trip
  // would not clear this window.
  await expect(page.getByText(factText)).toBeVisible({ timeout: 3_000 });
});
