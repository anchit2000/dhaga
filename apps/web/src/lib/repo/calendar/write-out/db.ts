import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { connectionCapabilities, followUpToCalendarEvent } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections, calendarEventLinks, contacts, followUps } from "@/lib/db/schema";
import { decryptToken, encryptOptionalToken, encryptToken } from "@/lib/crypto/tokens";
import { providerFor } from "../access";
import type { WriteOutcome, WritePlan, WriteTarget } from "./types";

const EMPTY_PLAN: WritePlan = { followUpId: "", event: null, targets: [] };

/**
 * Phase 1 — DATABASE ONLY. Reads the follow-up, the connections allowed to
 * receive it, and any events we already wrote, then hands the network phase
 * everything it needs so no HTTP call is ever made while a tenant connection is
 * checked out. Sequential reads on the one request-scoped connection; no
 * getDb() fan-out, no Promise.all.
 */
export async function loadWritePlan(followUpId: string): Promise<WritePlan> {
  const db = await getDb();
  const [followUp] = await db
    .select({
      action: followUps.action,
      dueDate: followUps.dueDate,
      status: followUps.status,
      contactName: contacts.name,
    })
    .from(followUps)
    .innerJoin(contacts, eq(contacts.id, followUps.contactId))
    .where(eq(followUps.id, followUpId))
    .limit(1);
  if (!followUp) return EMPTY_PLAN;

  const rows = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.status, "connected"));
  const writable = rows.filter((row) => {
    const provider = providerFor(row);
    return row.writeEnabled && provider !== null && connectionCapabilities(provider, row.scope).writeEvents;
  });
  if (writable.length === 0) return EMPTY_PLAN;

  const links = await db
    .select()
    .from(calendarEventLinks)
    .where(
      and(
        eq(calendarEventLinks.followUpId, followUpId),
        inArray(calendarEventLinks.connectionId, writable.map((row) => row.id)),
      ),
    );
  const targets: WriteTarget[] = writable.map((row) => {
    const link = links.find((candidate) => candidate.connectionId === row.id);
    return {
      connectionId: row.id,
      providerId: row.provider,
      accessToken: decryptToken(row.accessToken),
      refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : null,
      expiresAt: row.expiresAt,
      scope: row.scope,
      writeCalendarId: row.writeCalendarId,
      linkId: link?.id ?? null,
      externalEventId: link?.externalEventId ?? null,
    };
  });
  return { followUpId, event: followUpToCalendarEvent(followUp), targets };
}

/**
 * Ids of the open follow-ups a note produced. The extraction path writes
 * follow-ups in bulk and hands back only fact ids, so this is how the caller
 * learns which rows to mirror — an AI-extracted follow-up has to reach the
 * calendar just like a hand-typed one.
 */
export async function openFollowUpIdsForNote(noteId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: followUps.id })
    .from(followUps)
    .where(and(eq(followUps.sourceNoteId, noteId), eq(followUps.status, "open")));
  return rows.map((row) => row.id);
}

/**
 * Phase 3 — DATABASE ONLY. Persists what the network phase did: refreshed
 * tokens, the Dhaga calendar we found or created, and the link rows that let a
 * later completion/dismissal delete the right event.
 */
export async function persistWriteOutcomes(
  followUpId: string,
  outcomes: WriteOutcome[],
): Promise<void> {
  const db = await getDb();
  for (const outcome of outcomes) {
    if (outcome.failed) {
      await db
        .update(calendarConnections)
        .set({ status: "needs_reconnect", updatedAt: new Date() })
        .where(eq(calendarConnections.id, outcome.connectionId));
      continue;
    }
    const patch: Partial<typeof calendarConnections.$inferInsert> = { updatedAt: new Date() };
    if (outcome.refreshed) {
      patch.accessToken = encryptToken(outcome.refreshed.accessToken);
      patch.refreshToken = encryptOptionalToken(outcome.refreshed.refreshToken);
      patch.expiresAt = outcome.refreshed.expiresAt;
      patch.scope = outcome.refreshed.scope ?? undefined;
    }
    if (outcome.writeCalendarId) patch.writeCalendarId = outcome.writeCalendarId;
    await db
      .update(calendarConnections)
      .set(patch)
      .where(eq(calendarConnections.id, outcome.connectionId));

    if (outcome.externalEventId === null) {
      if (outcome.linkId) {
        await db.delete(calendarEventLinks).where(eq(calendarEventLinks.id, outcome.linkId));
      }
      continue;
    }
    if (outcome.linkId) {
      await db
        .update(calendarEventLinks)
        .set({ externalEventId: outcome.externalEventId, updatedAt: new Date() })
        .where(eq(calendarEventLinks.id, outcome.linkId));
    } else {
      await db.insert(calendarEventLinks).values({
        id: randomUUID(),
        connectionId: outcome.connectionId,
        followUpId,
        externalEventId: outcome.externalEventId,
      });
    }
  }
}
