import { test, expect } from "./fixtures";
import { uniqueName } from "./helpers";

/**
 * Events list + custom entities.
 *
 * Events (verified against CreateEventForm / EventsTable):
 * - Inline create form at `/app/events`: `input[name="name"]` (placeholder
 *   "Name a event — …"), submit button "Create event". The DataTable's own
 *   filter input has no `name`, so `input[name="name"]` is unambiguous.
 * - After create the event appears as a row in the table (name visible).
 *
 * Entities (verified against EntityForm):
 * - `/app/entities/new` renders EntityForm: `#entity-name`, a `#entity-type`
 *   native select, an optional `#entity-description`, submit "Create entity".
 * - When the account has no node types yet, the type select defaults to
 *   "Create new type…", which reveals a required `#new-type-name` field; fill
 *   it when present so the entity has a type. When types exist it stays hidden.
 * - On success the form navigates to `/app/entities/<id>`, whose <h1> is the
 *   entity name.
 */
test("create an event", async ({ page }) => {
  await page.goto("/app/events", { timeout: 60_000 });

  const name = uniqueName("Summit");
  await page.locator('input[name="name"]').fill(name);
  await page.getByRole("button", { name: "Create event" }).click();

  await expect(page.getByText(name).first()).toBeVisible({ timeout: 60_000 });
});

test("create a custom entity", async ({ page }) => {
  await page.goto("/app/entities/new", { timeout: 60_000 });

  const name = uniqueName("Gym");
  await page.locator("#entity-name").fill(name);

  // No node types yet → the type select defaults to "Create new type…" and
  // shows an inline type-name field. Fill it when present; hidden otherwise.
  const newTypeName = page.locator("#new-type-name");
  if (await newTypeName.isVisible().catch(() => false)) {
    await newTypeName.fill(uniqueName("Place"));
  }

  await page.getByRole("button", { name: "Create entity" }).click();

  // Lands on the entity detail page, headed by the entity name.
  await page.waitForURL(/\/app\/entities\/(?!new$)[^/]+$/, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name, level: 1 }),
  ).toBeVisible({ timeout: 60_000 });
});
