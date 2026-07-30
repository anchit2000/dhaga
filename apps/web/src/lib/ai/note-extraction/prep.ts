import type { CalendarDay, NodeTypeRef } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { listNodeTypes } from "@/lib/repo/node-types";
import { userToday } from "@/lib/repo/reminders/local-today";
import { assertAiBudget } from "../metering";

/** Everything the extraction prompt needs that has to come from the DB. */
export interface ExtractionPrep {
  /** Names + slugs only — never entity rows. Empty ⇒ registry-free prompt. */
  nodeTypes: NodeTypeRef[];
  /** The USER's calendar day, from their stored zone — not the server's UTC one. */
  today: CalendarDay;
}

/**
 * Prep phase (DB): budget check, node-type registry and the user's calendar day,
 * gathered inside ONE short scoped-db lifetime whose connection is released
 * BEFORE the LLM call — see the extraction worker's connection-lifecycle fix.
 *
 * All three reads are sequential inside the single scope, never a `Promise.all`
 * of separate `getDb()` checkouts: the tenant pool tops out at three connections
 * (see lib/repo/reminders/local-today.ts).
 *
 * `today` is resolved here, ONCE, rather than at each prompt builder: both
 * builders want the same day, and a lazy resolution at the prompt would reopen a
 * DB scope on the LLM path. It is what makes a note saying "follow up next
 * Tuesday" resolve against the user's day instead of the server's; a user who
 * never set a zone gets "UTC", which is server-local, so their prompt is
 * unchanged.
 */
export function prepareNoteExtraction(userId: string): Promise<ExtractionPrep> {
  return withUserDb(userId, async () => {
    await assertAiBudget(userId);
    const nodeTypes = (await listNodeTypes()).map(({ name, slug }) => ({ name, slug }));
    return { nodeTypes, today: await userToday() };
  });
}
