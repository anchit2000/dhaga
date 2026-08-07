import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { surfaceableContact } from "@/lib/repo/contacts/surfaceable";
import { listContactConnections } from "../connections";
import { decodeOffset, encodeOffset, tokens } from "./helpers";
import { INTENT_TERMS } from "./types";
import { resolveWarmContactIds } from "./warm";
import type { NetworkIntent, RecommendationPage, RecommendedContact } from "./types";

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

  const warmIds = await resolveWarmContactIds(db, directIds);

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
    // "Who to reach out to" is a proactive nomination, so it draws only from
    // the surfaceable set (lib/repo/contacts/surfaceable.ts) — no mention stubs,
    // no service rows. Both remain findable everywhere the user browses.
    .where(surfaceableContact)
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
