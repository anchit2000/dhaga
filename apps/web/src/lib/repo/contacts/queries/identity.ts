import { and, eq, ilike, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import type { ContactIdentityCandidate } from "./types";

// TODO(search-index): route through getSearchIndex() (matchMode: "exact")
export async function findContactIdentityCandidates(
  rawText: string,
): Promise<ContactIdentityCandidate[]> {
  const names = [
    ...new Set(
      rawText
        .normalize("NFC")
        .match(/\b\p{Lu}[\p{L}'-]{2,}\b/gu)
        ?.filter((word) => !["The", "This", "That", "Met", "Has", "Had", "His", "Her"].includes(word)) ?? [],
    ),
  ].slice(0, 8);
  if (names.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(
        ne(contacts.source, "mentioned"),
        or(...names.map((name) => ilike(contacts.name, `${name}%`))),
      ),
    )
    .limit(20);
  const normalized = rawText.toLocaleLowerCase();
  const fullNameMatches = rows.filter((row) =>
    normalized.includes(row.name.toLocaleLowerCase()),
  );
  if (fullNameMatches.length === 1) return [];
  if (fullNameMatches.length > 1) return fullNameMatches;
  const ambiguousFirstName = names.find(
    (name) =>
      rows.filter((row) => row.name.toLocaleLowerCase().startsWith(`${name.toLocaleLowerCase()} `) || row.name.toLocaleLowerCase() === name.toLocaleLowerCase()).length > 1,
  );
  return ambiguousFirstName
    ? rows.filter((row) =>
        row.name.toLocaleLowerCase().startsWith(`${ambiguousFirstName.toLocaleLowerCase()} `) ||
        row.name.toLocaleLowerCase() === ambiguousFirstName.toLocaleLowerCase(),
      )
    : [];
}

// TODO(search-index): route through getSearchIndex() (matchMode: "exact")
export async function listMentionMergeCandidates(
  mentionId: string,
  name: string,
): Promise<ContactIdentityCandidate[]> {
  const db = await getDb();
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(
        ne(contacts.id, mentionId),
        ne(contacts.source, "mentioned"),
        ilike(contacts.name, `%${firstName}%`),
      ),
    )
    .orderBy(contacts.name)
    .limit(10);
}
