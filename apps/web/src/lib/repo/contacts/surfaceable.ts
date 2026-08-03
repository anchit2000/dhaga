import { sql, type SQL } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";

/**
 * "A contact Dhaga may NOMINATE on a proactive surface" — the single definition
 * of which rows the app is allowed to put in front of the user unprompted.
 *
 * The distinction this encodes, and the only one that makes it safe: a contact
 * is never *nominated*, it is always still *findable*. Nothing here deletes,
 * archives, or hides a row. It only decides what Dhaga volunteers.
 *
 * APPLY IT ONLY to surfaces the app chose for the user:
 *   Today's tile, the graph fallback set, the cadence due list, going-quiet,
 *   recommendations, Recent people.
 *
 * NEVER apply it to a surface the user navigated to on purpose:
 *   People, Saved, search, duplicates, merge, Wrapped, address-book sync,
 *   export. Filtering there is an irreversible invisible hide — the user goes
 *   looking for "Vegetable Vendor", it is not in the list, and there is no
 *   message explaining why, no toggle to reveal it, and nothing to appeal to.
 *   A row omitted from Today is a row the user never asked about; a row omitted
 *   from search is a row the app has quietly decided they no longer own.
 *
 * Import it — never copy the two clauses into a query. A second copy would
 * drift silently, and drift here is invisible in both directions: a stale copy
 * either surfaces the noise this exists to suppress, or hides people from a
 * list they are supposed to be in.
 *
 * `IS DISTINCT FROM`, NEVER `<>`. `person_kind` is nullable and NULL is the
 * overwhelmingly common value (every contact until the classification backfill
 * drains). `NULL <> 'service'` evaluates to NULL, not TRUE, so a WHERE built on
 * `<>` matches ZERO unclassified rows — it would silently empty every proactive
 * surface of the entire graph, with no error and no failing query. This is the
 * highest-consequence single-token bug in the whole change.
 *
 * Wrapped in parens so it composes safely inside drizzle's `and()` / `or()`,
 * which join their operands without parenthesising each one.
 */
export const surfaceableContact: SQL = sql`(${contacts.source} <> 'mentioned' AND ${contacts.personKind} IS DISTINCT FROM 'service')`;
