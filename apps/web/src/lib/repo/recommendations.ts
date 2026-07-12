import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  companies,
  contacts,
  edges,
  eventContacts,
} from "@/lib/db/schema";
import { listContactConnections } from "./connections";

export type NetworkIntent = "general" | "founder" | "sales" | "investor";

export interface RecommendedContact {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  reasons: string[];
  action: string;
  score: number;
}

export interface RecommendationPage {
  items: RecommendedContact[];
  nextCursor: string | null;
}

const INTENT_TERMS: Record<NetworkIntent, RegExp> = {
  general: /$a/,
  founder: /founder|co-founder|operator|product|engineering|talent|investor|partner/i,
  sales: /chief|vp|head|director|procurement|buyer|revenue|operations|engineering/i,
  investor: /founder|co-founder|investor|partner|principal|venture|angel/i,
};

function tokens(value: string): string[] {
  return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 1))];
}

function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;
  const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function encodeOffset(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

export async function recommendContactsPage(
  contactId: string,
  options: {
    intent?: NetworkIntent;
    context?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<RecommendationPage> {
  const db = await getDb();
  const intent = options.intent ?? "general";
  const contextTokens = tokens(options.context ?? "");
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 24);
  const offset = decodeOffset(options.cursor);
  const direct = await listContactConnections(contactId);
  const directIds = direct.map((item) => item.contactId).slice(0, 50);

  const [me] = await db
    .select({
      tags: contacts.tags,
      location: contacts.location,
      companyId: contacts.companyId,
      companyName: companies.name,
      sector: companies.sector,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (!me) return { items: [], nextCursor: null };

  const warmIds = new Set<string>();
  if (directIds.length > 0) {
    const [edgeRows, directEvents, directCompanies] = await Promise.all([
      db
        .select({ srcId: edges.srcId, dstId: edges.dstId })
        .from(edges)
        .where(
          and(
            isNull(edges.deletedAt),
            or(inArray(edges.srcId, directIds), inArray(edges.dstId, directIds)),
          ),
        )
        .limit(500),
      db
        .select({ eventId: eventContacts.eventId })
        .from(eventContacts)
        .where(inArray(eventContacts.contactId, directIds))
        .limit(100),
      db
        .select({ companyId: contacts.companyId })
        .from(contacts)
        .where(inArray(contacts.id, directIds)),
    ]);
    for (const row of edgeRows) {
      if (!directIds.includes(row.srcId)) warmIds.add(row.srcId);
      if (!directIds.includes(row.dstId)) warmIds.add(row.dstId);
    }
    const eventIds = [...new Set(directEvents.map((row) => row.eventId))];
    if (eventIds.length > 0) {
      const rows = await db
        .select({ id: eventContacts.contactId })
        .from(eventContacts)
        .where(inArray(eventContacts.eventId, eventIds))
        .limit(500);
      for (const row of rows) warmIds.add(row.id);
    }
    const companyIds = directCompanies
      .map((row) => row.companyId)
      .filter((id): id is string => Boolean(id));
    if (companyIds.length > 0) {
      const rows = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(inArray(contacts.companyId, companyIds))
        .limit(500);
      for (const row of rows) warmIds.add(row.id);
    }
  }

  const excluded = new Set([contactId, ...directIds]);
  const candidates = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      sector: companies.sector,
      location: contacts.location,
      tags: contacts.tags,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(ne(contacts.source, "mentioned"))
    .limit(500);

  const myTags = new Set(me.tags.map((tag) => tag.toLowerCase()));
  const ranked: RecommendedContact[] = [];
  for (const candidate of candidates) {
    if (excluded.has(candidate.id)) continue;
    const sharedTags = candidate.tags.filter((tag) => myTags.has(tag.toLowerCase()));
    const haystack = [
      candidate.name,
      candidate.title,
      candidate.companyName,
      candidate.sector,
      candidate.location,
      ...candidate.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchedContext = contextTokens.filter((word) => haystack.includes(word));
    if (contextTokens.length > 0 && matchedContext.length !== contextTokens.length) continue;

    const warm = warmIds.has(candidate.id);
    const sameSector = Boolean(me.sector && candidate.sector === me.sector);
    const sameLocation = Boolean(me.location && candidate.location === me.location);
    const usefulContext = warm || sharedTags.length > 0 || sameSector || matchedContext.length > 0;
    if (!usefulContext) continue;

    let score = warm ? 5 : 0;
    score += sharedTags.length * 3;
    score += matchedContext.length * 4;
    if (sameSector) score += 3;
    if (sameLocation) score += 1;
    if (intent !== "general" && INTENT_TERMS[intent].test(candidate.title ?? "")) score += 2;

    const reasons: string[] = [];
    if (matchedContext.length > 0) reasons.push(`Matches ${matchedContext.join(", ")}`);
    if (sharedTags.length > 0) reasons.push(`Shared ${sharedTags.slice(0, 2).join(" + ")}`);
    if (sameSector && me.sector) reasons.push(`${me.sector} context`);
    if (warm) reasons.push("Reachable through your network");
    if (sameLocation && me.location) reasons.push(`Also in ${me.location}`);

    ranked.push({
      contactId: candidate.id,
      name: candidate.name,
      title: candidate.title,
      companyName: candidate.companyName,
      reasons: reasons.slice(0, 3),
      action: warm ? "Open their profile and inspect the warm path" : `Review why they match your ${intent === "general" ? "context" : intent + " goal"}`,
      score,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const items = ranked.slice(offset, offset + limit);
  return {
    items,
    nextCursor: offset + limit < ranked.length ? encodeOffset(offset + limit) : null,
  };
}

export async function recommendContacts(contactId: string): Promise<RecommendedContact[]> {
  return (await recommendContactsPage(contactId)).items;
}
