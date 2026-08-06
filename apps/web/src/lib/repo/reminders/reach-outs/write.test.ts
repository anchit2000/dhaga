import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { setDailySuggestionCount } from "@/lib/repo/suggestion-settings";
import { uniqueContact } from "@/lib/__tests__/support/contact-fixtures";
import { currentWeekdayWarning } from "./capacity";
import { setCadence } from "./write";

const AUTO = { weekday: null, monthDay: null, month: null };

describe("keep-in-touch schedule persistence", () => {
  it("persists Auto as a stable concrete weekday", async () => {
    const id = await uniqueContact("Auto cadence");
    const result = await setCadence(id, 7, AUTO);
    const db = await getDb();
    const [row] = await db.select().from(contacts).where(eq(contacts.id, id));
    expect(result.persisted).toBe(true);
    expect(result.schedule?.weekday).toBeTypeOf("number");
    expect(row.reachOutRecurrenceWeekday).toBe(result.schedule?.weekday);
    expect(row.reachOutRecurrenceFrequency).toBe("weekly");
  });

  it("preflights an overloaded weekday, then saves only after confirmation", async () => {
    await setDailySuggestionCount(1);
    const first = await uniqueContact("Monday capacity one");
    const second = await uniqueContact("Monday capacity two");
    const monday = { weekday: 1, monthDay: null, month: null };
    expect((await setCadence(first, 7, monday)).warning).toBeNull();
    const preview = await setCadence(second, 7, monday);
    expect(preview.persisted).toBe(false);
    expect(preview.warning).toContain("above your People/day setting of 1");
    const db = await getDb();
    const [before] = await db.select().from(contacts).where(eq(contacts.id, second));
    expect(before.reachOutRecurrenceWeekday).toBeNull();

    const saved = await setCadence(second, 7, monday, true);
    expect(saved.persisted).toBe(true);
    const [after] = await db.select().from(contacts).where(eq(contacts.id, second));
    expect(after.reachOutRecurrenceWeekday).toBe(1);
    expect(await currentWeekdayWarning(second, 1)).toBe(saved.warning);
  });
});
