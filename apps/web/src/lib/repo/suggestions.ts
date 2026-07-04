import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { findOrCreateCompany } from "./contacts";
import { getSetting, setSetting } from "./settings";
import { computeNameClusters } from "@/lib/suggestions/name-clusters";
import type { NameCluster } from "@/lib/suggestions/name-clusters";

const DISMISSED_KEY = "dismissed_name_clusters";

async function dismissedKeys(): Promise<string[]> {
  const raw = await getSetting(DISMISSED_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** Clusters worth showing: computed fresh, minus what the user dismissed. */
export async function getSuggestedClusters(): Promise<NameCluster[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      tags: contacts.tags,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));
  const dismissed = new Set(await dismissedKeys());
  return computeNameClusters(rows).filter((cluster) => !dismissed.has(cluster.key));
}

export async function dismissCluster(key: string): Promise<void> {
  const keys = await dismissedKeys();
  if (!keys.includes(key)) keys.push(key);
  await setSetting(DISMISSED_KEY, JSON.stringify(keys));
}

/** User confirmed the cluster as a community — tag every member. */
export async function tagCluster(tag: string, contactIds: string[]): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: contacts.id, tags: contacts.tags })
    .from(contacts)
    .where(inArray(contacts.id, contactIds));
  let updated = 0;
  for (const row of rows) {
    if (row.tags.includes(tag)) continue;
    await db
      .update(contacts)
      .set({ tags: [...row.tags, tag] })
      .where(eq(contacts.id, row.id));
    updated++;
  }
  return updated;
}

/**
 * User confirmed the cluster as an employer — link members to the company.
 * Only contacts with no company yet are touched: a confirmed suggestion
 * must never overwrite data the user (or an import) already set.
 */
export async function linkClusterToCompany(
  name: string,
  contactIds: string[],
): Promise<number> {
  const db = await getDb();
  const companyId = await findOrCreateCompany(name);
  const linked = await db
    .update(contacts)
    .set({ companyId })
    .where(and(inArray(contacts.id, contactIds), isNull(contacts.companyId)))
    .returning({ id: contacts.id });
  return linked.length;
}
