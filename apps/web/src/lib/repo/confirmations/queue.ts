import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import {
  confirmationPayloadSchema,
  type ConfirmationOption,
  type ConfirmationPayload,
  type ConfirmationType,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { confirmations, contacts, facts } from "@/lib/db/schema";

/** One pending confirmation, with the subject contact's name resolved for the
 *  inbox. `payload` is validated back into its discriminated shape so the UI
 *  can switch on `payload.type` without re-parsing. */
export interface ConfirmationView {
  id: string;
  type: ConfirmationType;
  payload: ConfirmationPayload;
  contactId: string | null;
  contactName: string | null;
  sourceNoteId: string | null;
  createdAt: Date;
}

/**
 * Hide a note_subject ONLY when it was raised inline. An inline one is a
 * synchronous quick-add card: it is answered where it was raised, so an
 * abandoned row would be a phantom the inbox can't clear. A note_subject raised
 * by a background batch (origin 'messaging') has NO other surface — hiding it
 * strands the user's note where nothing can reach it, so it must appear here
 * and in the badge. NULL origin predates the column and is therefore inline.
 *
 * Kept as one SQL predicate, shared by both queries below: the badge is a
 * COUNT and must stay a COUNT — never filter these in JS after the fetch.
 */
const VISIBLE_IN_INBOX: SQL = sql`not (
  ${confirmations.type} = 'note_subject'
  and coalesce(${confirmations.origin}, 'inline') = 'inline'
)`;

/** Pending confirmations, newest first, with the subject contact hydrated. */
export async function listPendingConfirmations(): Promise<ConfirmationView[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: confirmations.id,
      payload: confirmations.payload,
      contactId: confirmations.contactId,
      contactName: contacts.name,
      sourceNoteId: confirmations.sourceNoteId,
      createdAt: confirmations.createdAt,
    })
    .from(confirmations)
    .leftJoin(contacts, eq(contacts.id, confirmations.contactId))
    .where(and(eq(confirmations.status, "pending"), VISIBLE_IN_INBOX))
    .orderBy(desc(confirmations.createdAt));

  // safeParse, not parse: this runs over EVERY pending row, so one payload the
  // current schema can't read used to throw here and take out the whole inbox —
  // and Home with it, via its pending-confirmations tile. A row we cannot
  // interpret is one card the user doesn't see; it is not a reason to fail the
  // page. The row stays pending and untouched, so it returns as soon as the
  // schema can read it again.
  //
  // Nothing from the payload is logged: it carries contact names and
  // note-derived text (CLAUDE.md — never log contact PII in plaintext). The row
  // id plus the Zod paths are enough to find it.
  const views: ConfirmationView[] = [];
  for (const row of rows) {
    const parsed = confirmationPayloadSchema.safeParse(row.payload);
    if (!parsed.success) {
      console.warn(
        `[confirmations] skipping unreadable payload id=${row.id}: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")} ${issue.code}`)
          .join("; ")}`,
      );
      continue;
    }
    views.push({
      id: row.id,
      type: parsed.data.type,
      payload: parsed.data,
      contactId: row.contactId,
      contactName: row.contactName,
      sourceNoteId: row.sourceNoteId,
      createdAt: row.createdAt,
    });
  }

  // Backfill the claim for legacy enrichment_match rows. Older rows were
  // written with an empty `options` array (the fact text was threaded in
  // later), so the inbox card had nothing to show under "Does this detail
  // check out?". Re-derive the option from the fact the confirmation points
  // at — batched into ONE query to avoid an N+1 fan-out (this repo has
  // exhausted the tenant pool that way before).
  const factIds: string[] = [];
  for (const view of views) {
    const { payload } = view;
    if (
      payload.type === "enrichment_match" &&
      payload.options.length === 0 &&
      payload.apply.kind === "verify_fact"
    ) {
      factIds.push(payload.apply.factId);
    }
  }
  if (factIds.length === 0) return views;

  const factRows = await db
    .select({ id: facts.id, text: facts.text, type: facts.type })
    .from(facts)
    .where(and(inArray(facts.id, factIds), isNull(facts.deletedAt)));
  const factById = new Map(factRows.map((fact) => [fact.id, fact] as const));

  for (const view of views) {
    const { payload } = view;
    if (
      payload.type !== "enrichment_match" ||
      payload.options.length > 0 ||
      payload.apply.kind !== "verify_fact"
    ) {
      continue;
    }
    const fact = factById.get(payload.apply.factId);
    if (!fact) continue; // missing/deleted fact: leave options empty, don't crash
    const option: ConfirmationOption = { id: fact.id, label: fact.text, sublabel: fact.type };
    payload.options = [option];
  }

  return views;
}

/** Cheap COUNT for the nav badge — no payload hydration. */
export async function countPendingConfirmations(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(confirmations)
    // Same visibility rule as listPendingConfirmations — the badge must count
    // exactly what the inbox can show.
    .where(and(eq(confirmations.status, "pending"), VISIBLE_IN_INBOX));
  return row?.count ?? 0;
}
