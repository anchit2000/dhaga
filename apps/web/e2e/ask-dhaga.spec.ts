import { test, expect } from "./fixtures";

/**
 * The global command palette (Ctrl/Cmd+K or the "Search your network" trigger)
 * and its two tabs: instant local Search (free, always works) and Ask Dhaga (a
 * metered streaming Sonnet answer that may be unavailable/capped locally).
 *
 * Selectors (verified from SearchPalette source):
 * - Trigger: getByRole("button", { name: /Search your network/i }).
 * - Dialog: [role=dialog]; search input input[name="q"] (type=search).
 * - Tabs: getByRole("tab", { name: /Search/ }) and /Ask Dhaga/i.
 * - Ask submit button: "Ask Dhaga ✦" (only rendered once there's a query).
 * - Search results are links; the empty state renders "No matches".
 * - Ask degrade notices (any of): "Configure an LLM provider…", "Showing keyword
 *   matches…", "Nothing in your graph…", "Dhaga is busy…", "trouble answering".
 */

test("open the search palette and run a plain search", async ({ page }) => {
  await page.goto("/app", { timeout: 60_000 });

  const trigger = page.getByRole("button", { name: /Search your network/i });
  await expect(trigger).toBeVisible({ timeout: 60_000 });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.locator('input[name="q"]').fill("meeting");

  // Search debounces then dispatches: either result links or the "No matches"
  // empty state render — both mean the palette worked (no crash). The two are
  // mutually exclusive in the UI, so the union resolves to a single element.
  const results = dialog.getByRole("link");
  const noMatches = dialog.getByText(/No matches/i);
  await expect(results.first().or(noMatches)).toBeVisible({ timeout: 30_000 });
});

test("Ask Dhaga answers or degrades gracefully", async ({ page }) => {
  // Ask Dhaga is a streaming Sonnet call; first navigation also compiles the
  // route — give the whole test extra headroom.
  test.setTimeout(120_000);

  await page.goto("/app", { timeout: 60_000 });

  const trigger = page.getByRole("button", { name: /Search your network/i });
  await expect(trigger).toBeVisible({ timeout: 60_000 });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("tab", { name: /Ask Dhaga/i }).click();
  await dialog.locator('input[name="q"]').fill("Who did I meet recently in tech?");

  // The submit button ("Ask Dhaga ✦") only appears once there's a query. It's a
  // button, not the same-named tab (role=tab), so role scoping disambiguates.
  const ask = dialog.getByRole("button", { name: /Ask Dhaga/i });
  await expect(ask).toBeVisible();
  await ask.click();

  // Ask Dhaga can take 10-30s. Assert a terminal outcome — a streamed answer
  // (Receipts land beneath a real answer) OR any documented degrade notice —
  // never a specific answer. On an AI-less local server the "Configure an LLM
  // provider" notice is the expected, graceful pass.
  const outcome = dialog
    .getByText(
      /Configure an LLM provider|Showing keyword matches|Nothing in your graph|busy right now|trouble answering|upgrade for a reasoned/i,
    )
    .or(dialog.getByText(/^Receipts$/))
    .or(dialog.getByRole("button", { name: /^Retry$/i }))
    .or(dialog.getByRole("link", { name: /^Upgrade$/i }));
  await expect(outcome.first()).toBeVisible({ timeout: 60_000 });
});
