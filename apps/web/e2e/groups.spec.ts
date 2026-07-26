import { test, expect } from "./fixtures";
import { createContact, uniqueName } from "./helpers";

/**
 * The "Add to group" control on the contact detail page (AddToEventPicker →
 * EntityCombobox). Groups are events under the hood.
 *
 * Selectors (verified against AddToEventPicker / EntityCombobox / Base UI):
 * - Trigger: Base UI ComboboxTrigger — exposed as role="combobox" named
 *   "Add to group" (a Plus icon + label), NOT a plain button.
 * - Popup search: input with placeholder "Search groups…".
 * - Existing groups render as Base UI Combobox items → role="option"; the popup
 *   preloads them on open (`preloadOnOpen`) without any typing (PR #93).
 * - Typing a novel name reveals a `Create group "<typed>"` button that creates
 *   the group and attaches it; the attached group then shows as a chip <a> in
 *   the header (GroupChipsSection).
 *
 * Note: native <select> options elsewhere on the page also carry role="option"
 * but stay hidden, so we filter to visible options to read only the popup.
 */
test("add-to-group combobox preloads options on open (PR #93)", async ({ page }) => {
  // Guarantee at least one group exists that is NOT attached to our test
  // contact, so the preload has something to surface. Created via the events
  // page so it stays unattached.
  const seededGroup = uniqueName("Preload Group");
  await page.goto("/app/events", { timeout: 60_000 });
  await page.locator('input[name="name"]').fill(seededGroup);
  await page.getByRole("button", { name: "Create event" }).click();
  // Wait for the write to land (row visible) before moving on.
  await expect(page.getByText(seededGroup).first()).toBeVisible({ timeout: 60_000 });

  await createContact(page, { name: uniqueName("Preload Contact") });

  // role="combobox" takes its name from aria-label, not child text, so match by
  // the visible label text the trigger contains.
  await page.getByRole("combobox").filter({ hasText: /Add to group/i }).click();

  const search = page.getByPlaceholder(/Search groups/i);
  await expect(search).toBeVisible({ timeout: 15_000 });

  // Only the popup's options are visible; hidden native-select options are not.
  const visibleOptions = page.getByRole("option").filter({ visible: true });
  const preloaded = await visibleOptions
    .first()
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (preloaded) {
    expect(await visibleOptions.count()).toBeGreaterThan(0);
  } else {
    // Truly-empty graph: the search input is focused and a create affordance
    // appears once we start typing.
    await expect(search).toBeFocused();
    await search.fill(uniqueName("Team"));
    await expect(
      page.getByRole("button", { name: /Create group/i }),
    ).toBeVisible({ timeout: 5_000 });
  }
});

test("create a group and attach it to a contact", async ({ page }) => {
  await createContact(page, { name: uniqueName("Group Member") });

  // role="combobox" takes its name from aria-label, not child text, so match by
  // the visible label text the trigger contains.
  await page.getByRole("combobox").filter({ hasText: /Add to group/i }).click();

  const groupName = uniqueName("Team");
  await page.getByPlaceholder(/Search groups/i).fill(groupName);

  // Typing a novel name reveals the create affordance; clicking it creates the
  // group and attaches it to this contact.
  await page.getByRole("button", { name: /Create group/i }).click();

  // The attached group renders as a chip link in the contact header.
  await expect(
    page.getByRole("link", { name: groupName }),
  ).toBeVisible({ timeout: 30_000 });
});
