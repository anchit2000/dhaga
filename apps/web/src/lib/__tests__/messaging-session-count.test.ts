import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appendSessionItem, getOpenSession, getOrCreateOpenSession } from "@/lib/repo/messaging";

/** A chat id unique per test, so rows never collide in the file-scoped PGlite. */
function chat(): { provider: string; externalId: string } {
  return { provider: "telegram", externalId: `chat-${randomUUID()}` };
}

/**
 * getOpenSession's itemCount is not a statistic — it is the value TWO user-facing
 * decisions gate on, and both fail silently when it is wrong:
 *
 *   - handleDone refuses to flush a batch it reads as empty ("Nothing to save
 *     yet"), so DONE can never save anything; and
 *   - handleContent acks only the FIRST item (`wasFirst = itemCount === 0`), so a
 *     stuck-at-zero count makes the bot 👍 every single message.
 *
 * This must run against real Postgres: the regression it guards was a correlated
 * subquery whose interpolated column emitted UNQUALIFIED (`session_id = "id"`),
 * silently binding to the items table's own id and counting 0 forever. Both
 * tables have an `id`, so it was valid SQL — nothing but a real query can catch it.
 */
describe("getOpenSession item count", () => {
  it("counts the items actually in the batch, not zero", async () => {
    const where = chat();
    const created = await getOrCreateOpenSession(where);
    expect(created.itemCount).toBe(0);

    await appendSessionItem({
      sessionId: created.id,
      kind: "contact_card",
      payload: { vcard: "BEGIN:VCARD\r\nFN:Test\r\nEND:VCARD", displayName: "Test" },
      providerMessageId: `msg-${randomUUID()}`,
    });

    // WHY: this is the read DONE gates on. Zero here means the sender is told
    // "Nothing to save yet" while their forwarded card sits in the batch.
    expect((await getOpenSession(where))?.itemCount).toBe(1);

    await appendSessionItem({
      sessionId: created.id,
      kind: "text",
      payload: { text: "met at the summit" },
      providerMessageId: `msg-${randomUUID()}`,
    });
    expect((await getOpenSession(where))?.itemCount).toBe(2);
  });

  it("keeps a second item off the first-item ack path", async () => {
    const where = chat();
    const created = await getOrCreateOpenSession(where);
    await appendSessionItem({
      sessionId: created.id,
      kind: "text",
      payload: { text: "first" },
      providerMessageId: `msg-${randomUUID()}`,
    });

    // WHY: handleContent derives `wasFirst` from this exact call. If it keeps
    // reporting 0 the bot re-acks every message, which is what a sender sees
    // when the batch is silently not accumulating.
    const reopened = await getOrCreateOpenSession(where);
    expect(reopened.id).toBe(created.id);
    expect(reopened.itemCount).toBe(1);
  });

  it("counts each batch separately when a chat has more than one", async () => {
    const where = chat();
    const first = await getOrCreateOpenSession(where);
    await appendSessionItem({
      sessionId: first.id,
      kind: "text",
      payload: { text: "a" },
      providerMessageId: `msg-${randomUUID()}`,
    });
    await appendSessionItem({
      sessionId: first.id,
      kind: "text",
      payload: { text: "b" },
      providerMessageId: `msg-${randomUUID()}`,
    });

    // A second, unrelated chat's items must not leak into this chat's count —
    // the join is per-session, and a mis-qualified one would fan in everything.
    const other = await getOrCreateOpenSession(chat());
    await appendSessionItem({
      sessionId: other.id,
      kind: "text",
      payload: { text: "someone else" },
      providerMessageId: `msg-${randomUUID()}`,
    });

    expect((await getOpenSession(where))?.itemCount).toBe(2);
  });
});
