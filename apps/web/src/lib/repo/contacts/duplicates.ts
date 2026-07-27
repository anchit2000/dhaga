import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { methodValues } from "@dhaga/core";
import { computeNameClusters } from "@/lib/suggestions/name-clusters";
import type { ClusterableContact } from "@/lib/suggestions/name-clusters";
import type { ContactListItem } from "./queries";

/** A set of ≥2 contacts that look like the same person, and why they were
 *  grouped — an exact shared email/phone, or a fuzzy shared-surname match. */
export interface DuplicateContactCluster {
  reason: "email" | "phone" | "name";
  contacts: ContactListItem[];
}

// Duplicate detection is an explicit, occasional user action, so ONE full scan
// (as importContacts already does for its dedup preload) is acceptable — no
// getDb() fan-out. Capped to keep the payload bounded; this is a DOCUMENTED
// ceiling, not a silent drop (Rule 12) — exact email/phone matches (the
// strongest "same person" signal) are emitted before the coarser shared-surname
// clusters, so the cap sheds the weakest matches first, and the UI can note
// "showing the first N".
const DUPLICATE_CLUSTER_LIMIT = 50;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function addTo(map: Map<string, Set<string>>, key: string, id: string): void {
  const existing = map.get(key);
  if (existing) existing.add(id);
  else map.set(key, new Set([id]));
}

export async function findDuplicateContactClusters(): Promise<DuplicateContactCluster[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      tags: contacts.tags,
      starred: contacts.starred,
      createdAt: contacts.createdAt,
      emails: contacts.emails,
      phones: contacts.phones,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(ne(contacts.source, "mentioned"))
    .orderBy(desc(contacts.createdAt));

  const items = new Map<string, ContactListItem>();
  const byEmail = new Map<string, Set<string>>();
  const byPhone = new Map<string, Set<string>>();
  const clusterable: ClusterableContact[] = [];
  for (const row of rows) {
    items.set(row.id, {
      id: row.id,
      name: row.name,
      title: row.title,
      companyName: row.companyName,
      tags: row.tags,
      starred: row.starred,
      createdAt: row.createdAt,
    });
    clusterable.push({ id: row.id, name: row.name, tags: row.tags, companyName: row.companyName });
    for (const email of methodValues(row.emails)) {
      const key = normalizeEmail(email);
      if (key) addTo(byEmail, key, row.id);
    }
    for (const phone of methodValues(row.phones)) {
      const key = normalizePhone(phone);
      if (key) addTo(byPhone, key, row.id);
    }
  }

  const toItems = (ids: Iterable<string>): ContactListItem[] =>
    [...ids].map((id) => items.get(id)).filter((item): item is ContactListItem => item != null);

  const clusters: DuplicateContactCluster[] = [];
  for (const ids of byEmail.values()) {
    if (ids.size >= 2) clusters.push({ reason: "email", contacts: toItems(ids) });
  }
  for (const ids of byPhone.values()) {
    if (ids.size >= 2) clusters.push({ reason: "phone", contacts: toItems(ids) });
  }
  for (const cluster of computeNameClusters(clusterable, 2, DUPLICATE_CLUSTER_LIMIT)) {
    clusters.push({ reason: "name", contacts: toItems(cluster.contactIds) });
  }
  return clusters.slice(0, DUPLICATE_CLUSTER_LIMIT);
}
