import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, followUps } from "@/lib/db/schema";
import { SCHEDULING_DDL } from "@/lib/db/ddl/core/scheduling";
import type { PGlite } from "@electric-sql/pglite";

describe("follow-up scheduling schema", () => {
  it("stores a general recurring TODO without inventing a person or company", async () => {
    const db = await getDb();
    const id = randomUUID();
    await db.insert(followUps).values({
      id,
      contactId: null,
      companyId: null,
      action: "Reconcile monthly expenses",
      dueDate: new Date("2026-08-31T00:00:00.000Z"),
      recurrenceFrequency: "monthly",
      recurrenceInterval: 1,
      recurrenceWeekday: null,
      recurrenceMonthDay: 31,
      recurrenceMonth: null,
      status: "open",
    });

    const [row] = await db.select().from(followUps).where(eq(followUps.id, id));
    expect(row).toMatchObject({
      contactId: null,
      companyId: null,
      recurrenceFrequency: "monthly",
      recurrenceInterval: 1,
      recurrenceMonthDay: 31,
    });
  });

  it("stores an optional company association independently of a contact", async () => {
    const db = await getDb();
    const companyId = randomUUID();
    const id = randomUUID();
    await db.insert(companies).values({ id: companyId, name: "Schema Test Company" });
    await db.insert(followUps).values({
      id,
      contactId: null,
      companyId,
      action: "File the quarterly return",
      status: "open",
    });

    const [row] = await db.select().from(followUps).where(eq(followUps.id, id));
    expect(row.companyId).toBe(companyId);
    expect(row.contactId).toBeNull();
  });

  it("round-trips calendar-aware keep-in-touch selectors without replacing legacy cadence", async () => {
    const db = await getDb();
    const id = randomUUID();
    await db.insert(contacts).values({
      id,
      name: "Scheduled Contact",
      emails: [],
      phones: [],
      links: [],
      tags: [],
      source: "manual",
      reachOutEveryDays: 7,
      reachOutRecurrenceFrequency: "weekly",
      reachOutRecurrenceInterval: 1,
      reachOutRecurrenceWeekday: 3,
    });

    const [row] = await db.select().from(contacts).where(eq(contacts.id, id));
    expect(row).toMatchObject({
      reachOutEveryDays: 7,
      reachOutRecurrenceFrequency: "weekly",
      reachOutRecurrenceInterval: 1,
      reachOutRecurrenceWeekday: 3,
    });
  });

  it("promotes legacy weekly cadences to stable split weekdays", async () => {
    const db = await getDb();
    const prefix = `legacy-split-${randomUUID()}`;
    const ids = Array.from({ length: 7 }, (_, index) => `${prefix}-${index}`);
    await db.insert(contacts).values(ids.map((id, index) => ({
      id,
      name: `Legacy cadence ${index}`,
      emails: [],
      phones: [],
      links: [],
      tags: [],
      source: "manual" as const,
      reachOutEveryDays: 7,
    })));

    const client = (globalThis as { __dhagaClient?: PGlite }).__dhagaClient;
    expect(client).toBeDefined();
    await client!.exec(SCHEDULING_DDL);

    const rows = await db.select().from(contacts);
    const migrated = rows.filter((row) => ids.includes(row.id));
    expect(migrated.every((row) => row.reachOutRecurrenceFrequency === "weekly")).toBe(true);
    expect(new Set(migrated.map((row) => row.reachOutRecurrenceWeekday)).size).toBe(7);
  });
});
