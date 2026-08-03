import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { GoalMatchingSubject } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts, eventContacts, events, facts, notes } from "@/lib/db/schema";
import { lastTouchSql } from "@/lib/repo/last-touch";
import type { GoalRecallCandidate } from "@/lib/repo/goals";

/**
 * The graph context the match prompt judges each recalled candidate on.
 * `recallGoalCandidates` returns only name/title/company (it is retrieval, not
 * context assembly), and the prompt also reasons about place, where they were
 * met, what is on file about them, and how long it has been — objectives are
 * routinely about exactly those ("people from the Delhi trip", "anyone I
 * haven't spoken to in a year").
 *
 * Loaded in FOUR set-wide queries keyed by contact id, never one round-trip per
 * candidate: a per-candidate loop would be up to GOAL_MATCH_RUN_CAP × 4
 * queries a night. Every await is SEQUENTIAL, never Promise.all — the tenant
 * pool tops out at 3 connections (lib/repo/reminders/local-today.ts).
 *
 * The per-contact caps (12 facts, 5 notes × 240 chars) are applied INSIDE
 * buildGoalMatchingPrompt, so full arrays are returned here on purpose.
 */
export type GoalSubjectContext = Omit<GoalMatchingSubject, "name" | "title" | "company">;

function groupByContact<T>(
  rows: { contactId: string; value: T }[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.contactId);
    if (existing) existing.push(row.value);
    else grouped.set(row.contactId, [row.value]);
  }
  return grouped;
}

export async function loadGoalSubjectContext(
  candidates: GoalRecallCandidate[],
): Promise<Map<string, GoalSubjectContext>> {
  const ids = candidates.map((candidate) => candidate.contactId);
  const context = new Map<string, GoalSubjectContext>();
  if (ids.length === 0) return context;

  const db = await getDb();
  // lastTouchSql's join contract (lib/repo/last-touch.ts): both touch tables
  // joined in, soft-deleted notes excluded, GROUP BY the contact. Rendered to a
  // date string in SQL rather than read back as a Date — GREATEST() over mixed
  // timestamp sources has no driver type parser, so the value would arrive as
  // an unspecified string anyway.
  const rows = await db
    .select({
      id: contacts.id,
      location: contacts.location,
      lastTouch: sql<string>`to_char(${lastTouchSql}, 'YYYY-MM-DD')`,
    })
    .from(contacts)
    .leftJoin(notes, and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)))
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(inArray(contacts.id, ids))
    .groupBy(contacts.id);

  const eventRows = await db
    .select({ contactId: eventContacts.contactId, value: events.name })
    .from(eventContacts)
    .innerJoin(events, eq(events.id, eventContacts.eventId))
    .where(inArray(eventContacts.contactId, ids));

  const factRows = await db
    .select({ contactId: facts.contactId, value: facts.text })
    .from(facts)
    .where(and(inArray(facts.contactId, ids), isNull(facts.deletedAt)));

  const noteRows = await db
    .select({ contactId: sql<string>`${notes.contactId}`, value: notes.body })
    .from(notes)
    .where(and(inArray(notes.contactId, ids), isNull(notes.deletedAt)));

  const eventNames = groupByContact(eventRows);
  const factTexts = groupByContact(factRows);
  const noteBodies = groupByContact(noteRows);
  for (const row of rows) {
    context.set(row.id, {
      location: row.location,
      eventNames: eventNames.get(row.id) ?? [],
      facts: factTexts.get(row.id) ?? [],
      noteSnippets: noteBodies.get(row.id) ?? [],
      lastTouch: row.lastTouch,
    });
  }
  return context;
}
