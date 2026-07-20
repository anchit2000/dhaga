import {
  aliasedTable,
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, eventContacts, events } from "@/lib/db/schema";

export type ConnectionSource = "relationship" | "event" | "company";

export interface ConnectionReason {
  source: ConnectionSource;
  label: string;
  value: string;
}

export interface ConnectionItem {
  contactId: string;
  name: string;
  title: string | null;
  mentioned: boolean;
  reasons: ConnectionReason[];
  /** Kept for graph traversal callers and older UI consumers. */
  via: string[];
}

export interface ConnectionFilter {
  facets?: Partial<Record<ConnectionSource, string[]>>;
  query?: string;
}

export interface ConnectionFacet {
  source: ConnectionSource;
  value: string;
  label: string;
  count: number;
}

export interface ConnectionPage {
  items: ConnectionItem[];
  nextCursor: string | null;
  facets: ConnectionFacet[];
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

type Cursor = { name: string; id: string };

function decodeCursor(value?: string): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof parsed.name === "string" && typeof parsed.id === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function encodeCursor(item: ConnectionItem): string {
  return Buffer.from(
    JSON.stringify({ name: item.name, id: item.contactId }),
  ).toString("base64url");
}

function afterCursor(cursor: Cursor | null) {
  if (!cursor) return undefined;
  return or(
    gt(contacts.name, cursor.name),
    and(eq(contacts.name, cursor.name), gt(contacts.id, cursor.id)),
  );
}

function displayPredicate(predicate: string): string {
  return predicate.replaceAll("_", " ");
}

// TODO(search-index): route through getSearchIndex() (needs paginated list support)
export async function listContactConnectionsPage(
  contactId: string,
  options: {
    cursor?: string;
    limit?: number;
    filter?: ConnectionFilter;
    includeFacets?: boolean;
  } = {},
): Promise<ConnectionPage> {
  const db = await getDb();
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const cursor = decodeCursor(options.cursor);
  const filter = options.filter ?? {};
  const query = filter.query?.trim() ? `%${filter.query.trim()}%` : undefined;
  const rows: ConnectionItem[] = [];
  const add = (
    row: { id: string; name: string; title: string | null; source: string },
    reason: ConnectionReason,
  ) => {
    const found = rows.find((item) => item.contactId === row.id);
    if (found) {
      if (!found.reasons.some((item) => item.source === reason.source && item.value === reason.value)) {
        found.reasons.push(reason);
        found.via.push(reason.label);
      }
      return;
    }
    rows.push({
      contactId: row.id,
      name: row.name,
      title: row.title,
      mentioned: row.source === "mentioned",
      reasons: [reason],
      via: [reason.label],
    });
  };

  const selectedFacetCount = Object.values(filter.facets ?? {}).flat().length;
  const valuesFor = (source: ConnectionSource) => filter.facets?.[source] ?? [];
  const sourceEnabled = (source: ConnectionSource) =>
    selectedFacetCount === 0 || valuesFor(source).length > 0;
  const common = [afterCursor(cursor), query ? sql`${contacts.name} ILIKE ${query}` : undefined];

  if (
    sourceEnabled("company") &&
    (valuesFor("company").length === 0 || valuesFor("company").includes("same_company"))
  ) {
    const self = aliasedTable(contacts, "connection_self");
    const companyRows = await db
      .select({ id: contacts.id, name: contacts.name, title: contacts.title, source: contacts.source })
      .from(contacts)
      .innerJoin(self, eq(self.companyId, contacts.companyId))
      .where(and(eq(self.id, contactId), ne(contacts.id, contactId), ...common))
      .orderBy(asc(contacts.name), asc(contacts.id))
      .limit(limit + 1);
    for (const row of companyRows) {
      add(row, { source: "company", value: "same_company", label: "Same company" });
    }
  }

  if (sourceEnabled("event")) {
    const mine = aliasedTable(eventContacts, "connection_mine");
    const eventRows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        title: contacts.title,
        source: contacts.source,
        eventId: events.id,
        eventName: events.name,
      })
      .from(mine)
      .innerJoin(eventContacts, eq(eventContacts.eventId, mine.eventId))
      .innerJoin(contacts, eq(contacts.id, eventContacts.contactId))
      .innerJoin(events, eq(events.id, mine.eventId))
      .where(
        and(
          eq(mine.contactId, contactId),
          ne(contacts.id, contactId),
          valuesFor("event").length > 0
            ? inArray(events.id, valuesFor("event"))
            : undefined,
          ...common,
        ),
      )
      .orderBy(asc(contacts.name), asc(contacts.id))
      .limit(limit + 1);
    for (const row of eventRows) {
      add(row, { source: "event", value: row.eventId, label: row.eventName });
    }
  }

  if (sourceEnabled("relationship")) {
    const edgeRows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        title: contacts.title,
        source: contacts.source,
        predicate: edges.predicate,
      })
      .from(edges)
      .innerJoin(
        contacts,
        or(
          and(eq(edges.srcId, contactId), eq(edges.dstType, "contact"), eq(contacts.id, edges.dstId)),
          and(eq(edges.dstId, contactId), eq(edges.srcType, "contact"), eq(contacts.id, edges.srcId)),
        ),
      )
      .where(
        and(
          isNull(edges.deletedAt),
          valuesFor("relationship").length > 0
            ? inArray(edges.predicate, valuesFor("relationship"))
            : undefined,
          ...common,
        ),
      )
      .orderBy(asc(contacts.name), asc(contacts.id))
      .limit(limit + 1);
    for (const row of edgeRows) {
      add(row, {
        source: "relationship",
        value: row.predicate,
        label: displayPredicate(row.predicate),
      });
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name) || a.contactId.localeCompare(b.contactId));
  const items = rows.slice(0, limit);
  return {
    items,
    nextCursor: rows.length > limit && items.length > 0 ? encodeCursor(items[items.length - 1]) : null,
    facets: options.includeFacets === false ? [] : await listConnectionFacets(contactId),
  };
}

export async function listContactConnections(contactId: string): Promise<ConnectionItem[]> {
  return (await listContactConnectionsPage(contactId, { limit: MAX_PAGE_SIZE, includeFacets: false })).items;
}

async function listConnectionFacets(contactId: string): Promise<ConnectionFacet[]> {
  const db = await getDb();
  const self = aliasedTable(contacts, "facet_self");
  const mine = aliasedTable(eventContacts, "facet_mine");
  const [companyCount, eventRows, predicateRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(contacts)
      .innerJoin(self, eq(self.companyId, contacts.companyId))
      .where(and(eq(self.id, contactId), ne(contacts.id, contactId))),
    db
      .select({ value: events.id, label: events.name, count: count() })
      .from(mine)
      .innerJoin(eventContacts, eq(eventContacts.eventId, mine.eventId))
      .innerJoin(events, eq(events.id, mine.eventId))
      .where(and(eq(mine.contactId, contactId), ne(eventContacts.contactId, contactId)))
      .groupBy(events.id, events.name),
    db
      .select({ value: edges.predicate, count: count() })
      .from(edges)
      .where(
        and(
          isNull(edges.deletedAt),
          or(eq(edges.srcId, contactId), eq(edges.dstId, contactId)),
        ),
      )
      .groupBy(edges.predicate),
  ]);
  const facets: ConnectionFacet[] = [];
  const sameCompanyCount = Number(companyCount[0]?.count ?? 0);
  if (sameCompanyCount > 0) {
    facets.push({ source: "company", value: "same_company", label: "Same company", count: sameCompanyCount });
  }
  for (const row of eventRows) {
    facets.push({ source: "event", value: row.value, label: row.label, count: Number(row.count) });
  }
  for (const row of predicateRows) {
    facets.push({ source: "relationship", value: row.value, label: displayPredicate(row.value), count: Number(row.count) });
  }
  return facets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
