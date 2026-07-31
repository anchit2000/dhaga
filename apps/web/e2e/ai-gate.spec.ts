import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { createContact, uniqueName } from "./helpers";

/**
 * THE ZERO-CREDIT STATE, IN A REAL BROWSER.
 *
 * `aiGateReason` (lib/ai/gate.ts) is unit-tested; what no unit test can see is
 * what the screen does when the credits are gone. Every control that would
 * spend one must be disabled AND say why (AiGateNotice) — and, the important
 * half, every free path (Manual capture, manual fact/follow-up/note, plain
 * search) must stay usable. Greying those too makes a working product look
 * broken.
 *
 * SETUP THIS SPEC CANNOT CREATE (the gate reads real spend): the server needs
 * an LLM key (`hasLLM()`, else the gate returns null BY DESIGN and nothing is
 * grey) and the account must have spent its monthly allowance — locally, seed
 * the embedded PGlite with a capful of `ai_actions` rows dated this month
 * BEFORE starting the server. `expectGated` re-asserts that state on every
 * surface, so a mis-seeded run fails loudly instead of passing vacuously.
 *
 * Selectors (verified from source): AiGateNotice = reason text + "See credits"
 * link; quick add opens on Manual, "Back to capture" reveals the AI pills;
 * "Scan card" only renders once the tray has a photo.
 */

/** The reason copy, matched on its two load-bearing halves — the allowance is
 *  spent (all N) and it returns on the 1st — not the exact sentence. */
const OUT_OF_CREDITS = /all \d+ (AI )?credits|all \d+ used/i;
const RESETS = /reset(s)? on the 1st/i;

const SHOTS = path.resolve(__dirname, "..", ".screenshots", "ai-gate");
/** A 1×1 PNG: enough to put an image in the tray so the gated "Scan card"
 *  submit renders. Never uploaded — the button is disabled, which is the point. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Prove the gate is genuinely on before trusting any "it's disabled" result. */
async function expectGated(page: Page): Promise<void> {
  const notice = page.getByText(OUT_OF_CREDITS).first();
  const why = "no AI-gate notice — is the account really out of credits?";
  await expect(notice, why).toBeVisible({ timeout: 30_000 });
  await expect(notice).toHaveText(RESETS);
  await expect(page.getByRole("link", { name: /See credits/i }).first()).toBeVisible();
}

/** Quick add opens on Manual; the AI pills live behind "Back to capture". */
async function openPasteTab(page: Page): Promise<void> {
  const back = page.getByRole("button", { name: /Back to capture/i });
  if (await back.count()) await back.first().click();
  await page.getByRole("button", { name: "Paste text" }).click();
}

/** `fullPage` where the gated controls don't fit one viewport (contact page). */
async function shoot(page: Page, file: string, fullPage = false): Promise<void> {
  await page.screenshot({ path: path.join(SHOTS, file), fullPage });
}

/** The three gated contact-page actions, and the three manual ones that must not be. */
const AI_ACTIONS = [/Brief me ✦/, /Draft follow-up ✦/, /Enrich from public web ✦/];
const FREE_ACTIONS = [/^Add fact$/, /^Add follow-up$/, /^Add note$/];

async function expectContactGated(page: Page): Promise<void> {
  await expectGated(page);
  const button = (n: RegExp, why: string) => expect(page.getByRole("button", { name: n }), why);
  for (const n of AI_ACTIONS) await button(n, `${n} gated`).toBeDisabled({ timeout: 30_000 });
  for (const n of FREE_ACTIONS) await button(n, `${n} NOT gated`).toBeEnabled({ timeout: 30_000 });
}

test.describe("AI credits exhausted — desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("quick add: extract + scan greyed with a reason, Manual still works", async ({ page }) => {
    await page.goto("/app/quick-add", { timeout: 60_000 });

    // Manual first: a regression that greys everything must fail here.
    const savePerson = page.getByRole("button", { name: "Save person" });
    await expect(savePerson).toBeVisible({ timeout: 60_000 });
    await expect(savePerson).toBeEnabled();
    await page.fill("#name", "Gate check (not saved)");
    await expect(savePerson).toBeEnabled();
    await shoot(page, "desktop-quick-add-manual-enabled.png");

    await openPasteTab(page);
    await expectGated(page);
    await expect(page.getByRole("button", { name: /Extract contact/i })).toBeDisabled();

    // Capture isn't gated — only the submit that spends a credit.
    const paste = page.getByPlaceholder(/Paste anything with a person/i);
    await paste.fill("Ada Lovelace — Analytical Engines, ada@example.com");
    await expect(paste).toHaveValue(/Ada Lovelace/);
    await shoot(page, "desktop-quick-add-paste-gated.png");

    await page.getByRole("button", { name: "Card photo" }).click();
    await expectGated(page);
    await page
      .locator('input[type="file"][name="photo"]')
      .first()
      .setInputFiles({ name: "card.png", mimeType: "image/png", buffer: PNG_1X1 });
    await expect(page.getByRole("button", { name: /^Scan card$/i })).toBeDisabled({
      timeout: 30_000,
    });
    await shoot(page, "desktop-quick-add-scan-gated.png");
  });

  test("nav Add dialog: the same capture controls are greyed", async ({ page }) => {
    await page.goto("/app", { timeout: 60_000 });
    await page.getByRole("button", { name: /^Add$/ }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Save person" })).toBeEnabled();
    await dialog.getByRole("button", { name: /Back to capture/i }).click();
    await dialog.getByRole("button", { name: "Paste text" }).click();
    await expectGated(page);
    await expect(dialog.getByRole("button", { name: /Extract contact/i })).toBeDisabled();
    await shoot(page, "desktop-nav-add-dialog-gated.png");
  });

  test("contact page: brief/draft/enrich greyed, manual adds enabled", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(await createContact(page, { name: uniqueName("AI gate") }));
    await expectContactGated(page);
    // One notice per gated section — a disabled button can't show a hover hint.
    expect(await page.getByText(OUT_OF_CREDITS).count()).toBeGreaterThanOrEqual(3);
    // Enabled, and actually usable: the manual fact form still opens.
    await page.getByRole("button", { name: /^Add fact$/ }).first().click();
    await expect(page.getByPlaceholder(/What did you learn|fact/i).first()).toBeVisible();
    await shoot(page, "desktop-contact-gated.png", true);
  });

  test("palette: Ask Dhaga greyed, plain Search still works", async ({ page }) => {
    await page.goto("/app", { timeout: 60_000 });
    await page.getByRole("button", { name: /Search your network/i }).click();

    const dialog = page.getByRole("dialog");
    await dialog.locator('input[name="q"]').fill("gate");
    await expect(
      dialog.getByRole("link").first().or(dialog.getByText(/No matches/i)),
    ).toBeVisible({ timeout: 30_000 });
    await shoot(page, "desktop-palette-search-enabled.png");

    await dialog.getByRole("tab", { name: /Ask Dhaga/i }).click();
    await expectGated(page);
    await expect(dialog.getByRole("button", { name: /Ask Dhaga ✦/i })).toBeDisabled();
    await shoot(page, "desktop-palette-ask-gated.png");
  });
});

test.describe("AI credits exhausted — mobile 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("quick add + contact page stay gated and readable at 375px", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/app/quick-add", { timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Save person" })).toBeEnabled({
      timeout: 60_000,
    });

    await openPasteTab(page);
    await expectGated(page);
    await expect(page.getByRole("button", { name: /Extract contact/i })).toBeDisabled();
    // The notice wraps instead of pushing the page sideways (mobile-first rule).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "gated quick add must not scroll horizontally").toBeLessThanOrEqual(1);
    await shoot(page, "mobile-quick-add-paste-gated.png");

    await page.goto(await createContact(page, { name: uniqueName("AI gate mobile") }));
    await expectContactGated(page);
    await shoot(page, "mobile-contact-gated.png", true);
  });
});
