import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { afterCursor, decodeCursor, encodeCursor } from "./cursor";
import { listConnectionFacets } from "./facets";
import { addCompanyMatches, addEventMatches, addRelationshipMatches } from "./sources";
import type {
  ConnectionFilter,
  ConnectionItem,
  ConnectionPage,
  ConnectionReason,
  ConnectionSource,
} from "./types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

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
    await addCompanyMatches(db, contactId, common, limit, add);
  }

  if (sourceEnabled("event")) {
    await addEventMatches(db, contactId, common, limit, valuesFor("event"), add);
  }

  if (sourceEnabled("relationship")) {
    await addRelationshipMatches(db, contactId, common, limit, valuesFor("relationship"), add);
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
