import { test, expect } from "./fixtures";
import { createContact, uniqueName, addJob } from "./helpers";
import type { Page } from "@playwright/test";

/**
 * Contact create/edit flows. Every test creates its own `[e2e]`-prefixed data
 * so runs stay independent and repeatable. Selectors lean on roles / ids /
 * placeholders (the app ships no data-testids).
 */

/** A saved contact lands on `/app/people/<id>` — never `/new`, never `/edit`. */
const DETAIL_URL = /\/app\/people\/(?!new$)[^/]+$/;

/** The inline save-failure message; must be absent on every successful save. */
const SAVE_ERROR = /Something interrupted the save/i;

test.describe("contacts", () => {
  test("create a contact", async ({ page }) => {
    const name = uniqueName("Ada");
    const url = await createContact(page, { name, company: uniqueName("Acme") });

    expect(url).toMatch(DETAIL_URL);
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 60_000 });
  });

  test("edit a contact", async ({ page }) => {
    const url = await createContact(page, { name: uniqueName("Grace") });
    const nickname = uniqueName("Ace");
    const location = uniqueName("Berlin");

    await page.goto(`${url}/edit`);
    await page.fill("#nickname", nickname);
    await page.fill("#location", location);
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(DETAIL_URL, { timeout: 60_000 });
    // Persisted values render on the detail page: nickname in the header,
    // location as a chip in the info card.
    await expect(page.getByText(nickname)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(location)).toBeVisible();
  });

  /**
   * PR #96 — tenant-pool-exhaustion save regression. Saving a contact with
   * several DISTINCT companies used to fan out getDb() checkouts (one per
   * company upsert) and starve the small per-tenant pool, so the save timed
   * out with "Something interrupted the save". The withUserDb fix pins one
   * connection for the whole write.
   *
   * NOTE: against local PGlite (a single in-process connection) there is no
   * pool to exhaust, so this ALWAYS passes there. To truly exercise #96 run it
   * against a Supabase-backed deployment (E2E_BASE_URL=https://…): without the
   * fix it fails there, with it it passes.
   */
  test("saves a contact with 3 distinct companies (pool-exhaustion regression, PR #96)", async ({
    page,
  }) => {
    const url = await createContact(page, { name: uniqueName("Poolcheck") });
    await page.goto(`${url}/edit`);

    // Three separate company upserts in one save.
    await addJob(page, 0, { title: uniqueName("Engineer"), company: "Alpha Labs [e2e]" });
    await addJob(page, 1, { title: uniqueName("Advisor"), company: "Beta Corp [e2e]" });
    await addJob(page, 2, { title: uniqueName("Partner"), company: "Gamma Inc [e2e]" });

    await page.getByRole("button", { name: "Save changes" }).click();

    // Success = redirected back to the detail page AND no failure banner.
    await page.waitForURL(DETAIL_URL, { timeout: 60_000 });
    await expect(page.getByText(SAVE_ERROR)).toHaveCount(0);
  });

  /**
   * P1 matrix — a partial profile must still save. Each case edits an existing
   * contact with only one thing filled in and asserts the save succeeds (back
   * on the detail page, no failure banner).
   */
  const partialEdits: { label: string; apply: (page: Page) => Promise<void> }[] = [
    {
      label: "only a company (no title)",
      apply: async (page) => {
        await addJob(page, 0, { company: uniqueName("Solo Co") });
        // The company combobox opens a dropdown on typing; blur it (focus the
        // name field) so it can't overlay the Save button.
        await page.locator("#name").click();
      },
    },
    {
      label: "only a job title (no company)",
      apply: async (page) => {
        await page.getByRole("button", { name: "Add job" }).click();
        await page.getByPlaceholder("Title").first().fill(uniqueName("Founder"));
      },
    },
    {
      label: "only a nickname",
      apply: async (page) => {
        await page.fill("#nickname", uniqueName("Nix"));
      },
    },
  ];

  for (const edit of partialEdits) {
    test(`incomplete-profile edit persists — ${edit.label}`, async ({ page }) => {
      const url = await createContact(page, { name: uniqueName("Partial") });
      await page.goto(`${url}/edit`);

      await edit.apply(page);
      await page.getByRole("button", { name: "Save changes" }).click();

      await page.waitForURL(DETAIL_URL, { timeout: 60_000 });
      await expect(page.getByText(SAVE_ERROR)).toHaveCount(0);
    });
  }
});
