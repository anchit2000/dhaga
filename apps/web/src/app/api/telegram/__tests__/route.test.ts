import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema/auth";
import { resolveOwnerUserId } from "../route";

/**
 * Regression coverage for the Telegram owner-resolution cache (docs/ideas.md
 * #6). A deployment owner can plausibly wire up the Telegram webhook/bot
 * token before finishing their own Dhaga signup — deploy, then sign up,
 * then become the bootstrap admin is the documented setup order. If the
 * bot receives a message in that window, resolveOwnerUserId() must not
 * permanently memoize the "no owner yet" answer: the next message, even in
 * the same warm serverless instance, has to see the owner once they exist.
 * Positive resolutions are still expected to cache forever (one DB
 * round-trip per warm process, not one per Telegram message).
 */
describe("resolveOwnerUserId", () => {
  it(
    "does not cache a negative resolution, but caches the positive one once an owner exists " +
      "(same module instance throughout — simulates one warm process across multiple Telegram messages)",
    async () => {
      // Phase 1: bot is live, nobody has signed up yet.
      const beforeSignup = await resolveOwnerUserId();
      expect(beforeSignup).toBeNull();

      // Phase 2: owner completes signup and becomes the bootstrap admin.
      const db = await getDb();
      const ownerId = randomUUID();
      await db.insert(authUser).values({
        id: ownerId,
        name: "Owner",
        email: `owner-${ownerId}@example.com`,
        isAdmin: true,
      });

      // The next Telegram message arrives in the same process. Before the
      // fix, `cachedOwnerId` was already permanently set to `null` from
      // phase 1, so this would incorrectly return null forever. The fix
      // must re-query and find the now-existing admin.
      const afterSignup = await resolveOwnerUserId();
      expect(afterSignup).toBe(ownerId);

      // Phase 3: a further message must not hit the DB again — the positive
      // resolution should now be cached for the rest of this warm process.
      const selectSpy = vi.spyOn(db, "select");
      const thirdCall = await resolveOwnerUserId();
      expect(thirdCall).toBe(ownerId);
      expect(selectSpy).not.toHaveBeenCalled();
      selectSpy.mockRestore();
    },
  );
});
