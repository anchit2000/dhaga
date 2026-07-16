import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

/** (contact, tag) rows expanded in SQL from the jsonb tags column — every
 *  tag-layer query aggregates over this subquery; nothing iterates tags in
 *  JS, so an 800k-pair graph never materialises as 800k JS objects. `alias`
 *  lets one query nest two instances without a name collision. */
export function tagRows(db: DhagaDb, alias = "tag_rows") {
  return db
    .select({
      contactId: contacts.id,
      tag: sql<string>`jsonb_array_elements_text(${contacts.tags})`.as("tag"),
    })
    .from(contacts)
    .as(alias);
}

/** SQL twin of utils/slug#toSlug — MUST stay in lockstep so `tag:{slug}` ids
 *  computed here match the ids merged client-side. */
export function slugOf(tag: SQLWrapper): SQL<string> {
  return sql<string>`regexp_replace(regexp_replace(lower(${tag}), '[^a-z0-9]+', '_', 'g'), '^_+|_+$', '', 'g')`;
}
