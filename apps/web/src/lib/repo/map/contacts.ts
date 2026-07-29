import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";

/** A contact carrying location text, i.e. one that can appear on the map. */
export interface LocatableContact {
  id: string;
  name: string;
  /** Trimmed free-text location as the user's data spells it ("Bengaluru"). */
  location: string;
}

export interface LocatableContacts {
  located: LocatableContact[];
  /** Contacts with no location text at all — the common case, and the number
   *  that keeps the map honest about how much of the network it is showing. */
  missingCount: number;
}

/**
 * Every contact split into "has location text" and "has none", in ONE query.
 *
 * Deliberately unfiltered + partitioned in JS rather than two SQL statements
 * (rows + a COUNT): one round trip, one scoped connection, and it mirrors
 * fetchFullGraph, which already selects a column set for every contact. The
 * getDb() here is the memoized per-request one — the caller must never invoke
 * this per place or per row (the fan-out bug class behind PRs #60/#96).
 *
 * `location` is the contacts table's free-text city/country field; structured
 * addresses[] is a different, import-only shape and is not consulted here.
 */
export async function fetchLocatableContacts(): Promise<LocatableContacts> {
  const db = await getDb();
  const rows = await db
    .select({ id: contacts.id, name: contacts.name, location: contacts.location })
    .from(contacts);

  const located: LocatableContact[] = [];
  let missingCount = 0;
  for (const row of rows) {
    const location = row.location?.trim() ?? "";
    if (!location) {
      missingCount += 1;
      continue;
    }
    located.push({ id: row.id, name: row.name, location });
  }
  return { located, missingCount };
}
