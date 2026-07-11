import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { signals } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { saveCardImage } from "@/lib/repo/card-images";
import { exportEverything } from "@/lib/export/data";

const contactInput = {
  name: "Export Everything Person",
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  location: null,
};

/**
 * The full JSON export is the product's "you can always leave with all your
 * data" guarantee (CLAUDE.md privacy rule, BRD M8) — not just the tables the
 * checklist happened to enumerate when it was written. `signals` (watchlist
 * hits about a contact) and `card_images` (the actual scanned business-card
 * photo, stored as base64 in Postgres) are both squarely "the user's data,"
 * but exportEverything silently omitted both. A user with either would leave
 * without them and have no way to know they were left behind.
 */
describe("exportEverything includes every table holding the user's own data", () => {
  it("includes signals and card_images alongside the previously-covered tables", async () => {
    const contactId = await createContact(contactInput, "manual");
    const db = await getDb();
    const signalId = randomUUID();
    await db.insert(signals).values({
      id: signalId,
      contactId,
      kind: "news",
      headline: "Quoted in a trade publication",
      detail: "Mentioned expanding the team.",
      status: "new",
    });
    const cardImageId = await saveCardImage(contactId, null, "image/jpeg", "ZmFrZS1qcGVn");

    const dump = await exportEverything();

    expect(dump.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: signalId, contactId })]),
    );
    expect(dump.card_images).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cardImageId, contactId })]),
    );
  });
});
