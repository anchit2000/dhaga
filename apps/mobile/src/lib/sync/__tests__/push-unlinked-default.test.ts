import { describe, expect, it } from "vitest";
import { PUSH_UNLINKED_DEFAULT } from "@/utils/constants/sync";

/**
 * The one setting on the sync screen whose wrong value cannot be undone.
 *
 * "Add Dhaga-only contacts to this phone" starts OFF. A user who never touches
 * it must finish a sync with an address book Dhaga added nobody to — because
 * the first run after it is enabled copies every contact they have EVER
 * authored here, not just the ones added since, and no later run takes those
 * back out (Dhaga never deletes from an address book). So turning it on is a
 * choice the user makes; onboarding points the switch out rather than flipping
 * it, exactly as the settings tour does for every email preference.
 *
 * It shipped ON briefly and was reversed on 2026-07-31. Pinned here because
 * nothing else can catch a reversal: the mobile vitest project is node-only by
 * design (no React Native runtime), so the hook holding this value cannot be
 * rendered in a test, and a silent flip back would stay invisible until a
 * user's phone had filled up.
 */
describe("pushing Dhaga-only contacts out is opt-in", () => {
  it("the sync screen starts with the switch off", () => {
    expect(PUSH_UNLINKED_DEFAULT).toBe(false);
  });
});
