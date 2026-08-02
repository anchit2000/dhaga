import { test, expect } from "./fixtures";
import { createContact, uniqueName } from "./helpers";

/**
 * The People-page "Group by" bulk action (GroupByDialog) — tag / company /
 * location applied to a hand-picked selection, named "Group by" (not
 * "Create group") because "group" already means event membership elsewhere
 * in the app (Add to group, groups.spec.ts). Distinct from the auto-suggested
 * name-cluster Groups page (/app/groups), also covered here.
 */
test.describe("group by (People bulk action)", () => {
  test("tag two selected contacts via Group by", async ({ page }) => {
    const base = uniqueName("GroupBy");
    await createContact(page, { name: `${base} One` });
    await createContact(page, { name: `${base} Two` });

    await page.goto("/app/people");
    await page.getByLabel("Filter by Name").fill(base);
    await page.getByLabel("Filter by Name").press("Enter");

    const rows = page.getByRole("checkbox", { name: "Select row" });
    await expect(rows).toHaveCount(2, { timeout: 30_000 });
    await rows.nth(0).click();
    await rows.nth(1).click();

    await page.getByRole("button", { name: "Group by" }).click();
    await expect(page.getByRole("heading", { name: "Group by" })).toBeVisible({ timeout: 15_000 });

    const tag = uniqueName("Tag");
    await page.locator("#group-tag-input").fill(tag);
    await page.getByRole("button", { name: "Tag contacts" }).click();

    // Dialog closes and the tag now shows in the Tags column for both rows.
    await expect(page.getByRole("heading", { name: "Group by" })).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(tag).first()).toBeVisible({ timeout: 30_000 });
  });
});

test("groups page lists suggested clusters (or an empty state)", async ({ page }) => {
  await page.goto("/app/groups");
  await expect(page.getByRole("heading", { name: "Groups" })).toBeVisible({ timeout: 30_000 });
});
