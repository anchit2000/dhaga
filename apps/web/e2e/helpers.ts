import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared helpers + selector notes for the flow specs. The app ships no
 * data-testids, so selectors lean on roles / labels / placeholders / visible
 * text (all catalogued per flow in each spec). Keep new selectors resilient:
 * prefer getByRole/getByLabel over CSS.
 */

/** Greppable prefix so anything a run creates is easy to spot and purge. */
export const E2E_PREFIX = "[e2e]";

/** A name unique per run, so reruns never collide on existing rows. */
export function uniqueName(base: string): string {
  return `${E2E_PREFIX} ${base} ${Date.now().toString(36)}`;
}

/**
 * Create a contact via the manual add form and return its detail URL. The
 * first job's Company field is an inline EntityCombobox (aria-label "Company");
 * typing a value is enough — the form persists the typed company name.
 */
export async function createContact(
  page: Page,
  opts: { name: string; company?: string },
): Promise<string> {
  await page.goto("/app/people/new");
  await page.fill("#name", opts.name);
  if (opts.company) {
    // A fresh form renders no job rows, so there's no Company field yet —
    // add a job first to reveal it.
    await page.getByRole("button", { name: "Add job" }).click();
    await page.getByLabel("Company").first().fill(opts.company);
    // Close the combobox results dropdown so it can't cover the submit button.
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Save person" }).click();
  await page.waitForURL(/\/app\/people\/(?!new$)[^/]+$/, { timeout: 30_000 });
  return page.url();
}

/** Delete a contact from its detail page (full cascade). Best-effort cleanup. */
export async function forgetContact(page: Page, contactUrl: string): Promise<void> {
  await page.goto(contactUrl);
  const forget = page.getByRole("button", { name: /Forget contact|Delete/i });
  if ((await forget.count()) === 0) return;
  page.once("dialog", (d) => d.accept().catch(() => {}));
  await forget.first().click();
  // A confirm dialog (custom) may render — accept it if present.
  const confirm = page.getByRole("button", { name: /^(Forget|Delete|Confirm)$/i });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
}

/** Add a job row (Title + Company) to a mounted ContactForm. */
export async function addJob(
  page: Page,
  index: number,
  job: { title?: string; company: string },
): Promise<void> {
  await page.getByRole("button", { name: "Add job" }).click();
  const companies = page.getByLabel("Company");
  await companies.nth(index).fill(job.company);
  if (job.title) {
    await page.getByPlaceholder("Title").nth(index).fill(job.title);
  }
}

/** Assert an element is visible within the given timeout (readability sugar). */
export async function expectVisible(page: Page, selector: string, timeout = 15_000): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible({ timeout });
}
