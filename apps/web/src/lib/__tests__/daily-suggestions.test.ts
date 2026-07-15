import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";

const input = (name: string, company: string | null = null) => ({
  name,
  title: null,
  company,
  emails: [],
  phones: [],
  links: [],
  location: null,
});

async function makeDue(id: string, everyDays: number, daysAgo: number): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ reachOutEveryDays: everyDays, lastReachedOutAt: new Date(Date.now() - daysAgo * 86_400_000) })
    .where(eq(contacts.id, id));
}

// One PGlite instance per file, so these tests share a DB and run in order:
// the graph-fallback case runs FIRST, while nothing is due yet.
describe("buildDailySuggestions", () => {
  it("fills a leftover slot purely by graph traversal when nothing is due", async () => {
    const hub = await createContact(input(`Hub ${randomUUID()}`), "manual");
    const spoke = await createContact(input(`Spoke ${randomUUID()}`), "manual");
    const db = await getDb();
    await db.insert(edges).values({
      id: randomUUID(),
      srcType: "contact",
      srcId: hub,
      predicate: "knows",
      dstType: "contact",
      dstId: spoke,
      sourceNoteId: null,
      createdAt: new Date(),
    });
    const { suggestions } = await buildDailySuggestions({ count: 3 });
    // Nothing has a cadence yet, so the connected contacts fill the slots.
    expect(suggestions.some((item) => item.bucket === "graph" && item.contactId === hub)).toBe(true);
  });

  it("pins an overdue daily-cadence contact as a check-in, ahead of graph fill", async () => {
    const id = await createContact(input(`Daily ${randomUUID()}`), "manual");
    await makeDue(id, 1, 3); // Daily cadence, last touched 3 days ago → overdue
    const { suggestions } = await buildDailySuggestions({ count: 5 });
    const found = suggestions.find((item) => item.contactId === id);
    expect(found).toBeDefined();
    expect(found?.bucket).toBe("daily");
  });

  it("never exceeds the configured count even when more are due", async () => {
    for (let i = 0; i < 8; i++) {
      const id = await createContact(input(`Cap ${i} ${randomUUID()}`), "manual");
      await makeDue(id, 1, 3);
    }
    const { suggestions } = await buildDailySuggestions({ count: 5 });
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });
});
