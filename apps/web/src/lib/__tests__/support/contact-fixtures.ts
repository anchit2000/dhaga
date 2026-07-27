import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/request-scope";
import { edges, embeddings, signals } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import type { ContactMergeResolution } from "@dhaga/core";

/** A minimal ExtractedContact with the given name; override any field. */
export function plainContact(
  name: string,
  extra: Partial<Parameters<typeof createContact>[0]> = {},
) {
  return { name, title: null, company: null, emails: [], phones: [], links: [], location: null, ...extra };
}

/** A unique-named manual contact. Unique so tests sharing one PGlite file never
 *  collide via name-based mention promotion or the duplicate scan. */
export function uniqueContact(
  prefix: string,
  extra: Partial<Parameters<typeof createContact>[0]> = {},
): Promise<string> {
  return createContact(plainContact(`${prefix} ${randomUUID()}`, extra), "manual");
}

export async function insertSignal(contactId: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(signals).values({ id, contactId, kind: "news", headline: "h", detail: "d", status: "new" });
  return id;
}

export async function insertEdge(srcId: string, predicate: string, dstId: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(edges).values({ id, srcType: "contact", srcId, predicate, dstType: "contact", dstId });
  return id;
}

export async function insertEmbedding(
  ownerType: "note" | "fact" | "contact",
  ownerId: string,
  contactId: string,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(embeddings)
    .values({ ownerType, ownerId, contactId, content: "x", embedding: new Array(384).fill(0.1) });
}

export function mergeResolution(
  targetId: string,
  sourceIds: string[],
  extra: Partial<ContactMergeResolution> = {},
): ContactMergeResolution {
  return { targetId, sourceIds, name: "Merged", nickname: null, location: null, ...extra };
}
