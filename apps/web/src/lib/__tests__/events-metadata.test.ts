import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createEvent,
  getEvent,
  listEventFilterOptions,
  listEventsPage,
  updateEventMeta,
} from "@/lib/repo/events";

/**
 * Colour/emoji/tags are user-authored group decoration. What matters:
 *  - the columns round-trip (regression guard on the added schema),
 *  - `tags` is never null even when a group is created bare (the column is
 *    NOT NULL DEFAULT '[]', and every downstream `.tags.join()` assumes it),
 *  - updateEventMeta touches ONLY the keys it's given, so saving tags can't
 *    silently wipe a colour the user set earlier.
 */
describe("event metadata (colour, emoji, tags)", () => {
  it("createEvent persists emoji, colour, and tags", async () => {
    const id = await createEvent(`meta-${randomUUID()}`, {
      emoji: "🎪",
      color: "amber",
      tags: ["conference", "2026"],
    });
    const event = await getEvent(id);
    expect(event?.emoji).toBe("🎪");
    expect(event?.color).toBe("amber");
    expect(event?.tags).toEqual(["conference", "2026"]);
  });

  it("createEvent leaves tags as [] and style null when unset", async () => {
    const id = await createEvent(`plain-${randomUUID()}`);
    const event = await getEvent(id);
    expect(event?.tags).toEqual([]);
    expect(event?.emoji).toBeNull();
    expect(event?.color).toBeNull();
  });

  it("updateEventMeta changes only the provided fields", async () => {
    const id = await createEvent(`upd-${randomUUID()}`, {
      emoji: "🏢",
      color: "blue",
      tags: ["x"],
    });
    // Passing only tags must not disturb emoji/colour.
    await updateEventMeta(id, { tags: ["renamed"] });
    const afterTags = await getEvent(id);
    expect(afterTags?.emoji).toBe("🏢");
    expect(afterTags?.color).toBe("blue");
    expect(afterTags?.tags).toEqual(["renamed"]);
    // An explicit null clears the colour.
    await updateEventMeta(id, { color: null });
    expect((await getEvent(id))?.color).toBeNull();
  });
});

/**
 * The /app/events table reuses the People DataTable in server mode, so the
 * repo must return page rows AND a full-match total, and honour the same
 * name-substring + exact-tag filters the People page uses.
 */
describe("listEventsPage — search, tag filter, pagination", () => {
  it("filters by name substring, case-insensitively", async () => {
    const marker = randomUUID().slice(0, 8);
    await createEvent(`Helio ${marker} Expo`);
    await createEvent(`Unrelated ${randomUUID()}`);
    const { rows, total } = await listEventsPage({ page: 1, pageSize: 10, name: marker.toUpperCase() });
    expect(total).toBe(1);
    expect(rows[0]?.name).toContain(marker);
  });

  it("filters by an exact tag via jsonb containment", async () => {
    const tag = `t-${randomUUID().slice(0, 8)}`;
    const id = await createEvent(`Tagged ${randomUUID()}`, { tags: [tag, "shared"] });
    await createEvent(`Untagged ${randomUUID()}`, { tags: ["shared"] });
    const { rows, total } = await listEventsPage({ page: 1, pageSize: 10, tag });
    expect(total).toBe(1);
    expect(rows[0]?.id).toBe(id);
  });

  it("caps rows at pageSize while total counts every match", async () => {
    const marker = `pg-${randomUUID().slice(0, 8)}`;
    for (let index = 0; index < 3; index += 1) {
      await createEvent(`${marker} ${index}`);
    }
    const first = await listEventsPage({ page: 1, pageSize: 2, name: marker });
    expect(first.total).toBe(3);
    expect(first.rows).toHaveLength(2);
    const second = await listEventsPage({ page: 2, pageSize: 2, name: marker });
    expect(second.rows).toHaveLength(1);
  });

  it("listEventFilterOptions surfaces distinct tags for the filter dropdown", async () => {
    const tag = `opt-${randomUUID().slice(0, 8)}`;
    await createEvent(`Opt ${randomUUID()}`, { tags: [tag] });
    const { tags } = await listEventFilterOptions();
    expect(tags).toContain(tag);
  });
});
