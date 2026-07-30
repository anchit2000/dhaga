import path from "node:path";
import { expect, test } from "@playwright/test";
import { createContact, uniqueName } from "./helpers";

/**
 * Photo as the third way to capture a note (text, voice, photo).
 *
 * WHY this is worth an e2e: the value of the feature is not that a photo gets
 * attached — it is that the photo's TEXT lands in `notes.body`, which is what
 * makes the note searchable and what the extraction pipeline reads. A unit test
 * cannot see that, because it only happens once the vision call, the note write
 * and the person page's render line up. So this spec asserts the transcription
 * is visible AS the note, not that an upload succeeded.
 *
 * Needs a real LLM: run against a server with ANTHROPIC_API_KEY set and AI
 * budget (DHAGA_AI_MONTHLY_CAP), otherwise the composer correctly refuses a
 * photo-only note and this test fails loudly rather than passing hollow.
 *
 * Selectors (the app ships no data-testids):
 *  - photo picker: hidden file input `input[type="file"][name="notePhoto"]`
 *  - tray:         text "1 image of this note"
 *  - submit:       button "Read photo into a note"
 *  - note kind:    the note card's meta line starts "photo note ·"
 */
const SAMPLE_PHOTO = path.resolve(__dirname, "../../../rough/sample-visiting-card.jpeg");

test("a photo becomes a note whose body is the text read out of it", async ({ page }) => {
  const name = uniqueName("Photo Note");
  const contactUrl = await createContact(page, { name });

  await page.setInputFiles('input[type="file"][name="notePhoto"]', SAMPLE_PHOTO);

  // The tray is the confirmation that the photo is staged against THIS note
  // (and not, say, routed into the card scanner).
  await expect(page.getByText("1 image of this note")).toBeVisible();

  const notesBefore = await page.locator("li", { hasText: /photo note ·/ }).count();
  expect(notesBefore).toBe(0);

  // A vision round trip is slow by nature — the note is only saved once it
  // returns, because a photo has no body until then.
  await page.getByRole("button", { name: "Read photo into a note" }).click();
  const note = page.locator("li", { hasText: /photo note ·/ }).first();
  await expect(note).toBeVisible({ timeout: 60_000 });

  // The point of the feature: real text off the photo, in the note body. The
  // sample is a visiting card, so the transcription has to carry its lines —
  // an empty or one-word body would mean the image was stored and the text was
  // lost, which is the failure this feature exists to prevent.
  const body = ((await note.locator("p").first().textContent()) ?? "").trim();
  expect(body.length).toBeGreaterThan(20);
  expect(body).toMatch(/[A-Za-z]{3,}/);

  // The photo itself is kept as the note's visual receipt (storage setting is
  // on by default), served from the auth-gated card-image route.
  await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
  await expect(page.locator('img[src^="/api/card-image/"]').first()).toBeVisible();

  // The composer resets, so the next note starts clean rather than re-sending
  // the same photo.
  await expect(page.getByText("1 image of this note")).toBeHidden();
  expect(page.url()).toContain(contactUrl.split("/app/")[1]);
});
