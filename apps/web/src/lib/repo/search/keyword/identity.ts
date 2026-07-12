import { eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { SEARCH_WEIGHT_IDENTITY, SEARCH_WEIGHT_TRIGRAM } from "@/utils/constants/search";
import { buildTsQuery } from "../tokenize";
import type { KeywordHit } from "./types";

/** OR of `column ILIKE '%word%'` per word — trigram-indexed, so this stays
 *  index-backed even though it's a leading-wildcard pattern. Callers
 *  guarantee `words` is non-empty, so `or()` never returns undefined. */
function anyFragmentMatches(column: SQL, words: string[]): SQL {
  return or(...words.map((word) => ilike(column, `%${word}%`))) as SQL;
}

function firstMatch(words: string[], value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word)) ? value : undefined;
}

function firstArrayMatch(words: string[], values: string[]): string | undefined {
  return values.find((value) => {
    const lower = value.toLowerCase();
    return words.some((word) => lower.includes(word));
  });
}

/**
 * Identity + detail fields on contacts/companies. Name/title/company are
 * already visible on the result card, so only the "non-obvious" fields
 * (why else did this contact surface?) get a snippet — one, cheapest to
 * explain first.
 */
function detailSnippet(
  words: string[],
  row: {
    location: string | null;
    tags: string[];
    emails: string[];
    phones: string[];
    links: string[];
    companyDomain: string | null;
    companySector: string | null;
  },
): string | undefined {
  const location = firstMatch(words, row.location);
  if (location) return `location: ${location}`;
  const tag = firstArrayMatch(words, row.tags);
  if (tag) return `tag: ${tag}`;
  const email = firstArrayMatch(words, row.emails);
  if (email) return `email: ${email}`;
  const phone = firstArrayMatch(words, row.phones);
  if (phone) return `phone: ${phone}`;
  const link = firstArrayMatch(words, row.links);
  if (link) return `link: ${link}`;
  const domain = firstMatch(words, row.companyDomain);
  if (domain) return `company: ${domain}`;
  const sector = firstMatch(words, row.companySector);
  if (sector) return `sector: ${sector}`;
  return undefined;
}

/**
 * contacts + companies: name/title/location/tags and company name/sector
 * via tsvector rank; emails/phones/links/company domain via trigram, since
 * Postgres tokenizes an email or URL as a single lexeme — "freightline"
 * alone never matches "rohan@freightline.com" through tsvector.
 */
export async function contactAndCompanyHits(words: string[]): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const emailsMatch = anyFragmentMatches(sql`${contacts.emails}::text`, words);
  const phonesMatch = anyFragmentMatches(sql`${contacts.phones}::text`, words);
  const linksMatch = anyFragmentMatches(sql`${contacts.links}::text`, words);
  const domainMatch = anyFragmentMatches(sql`${companies.domain}`, words);

  const rows = await db
    .select({
      id: contacts.id,
      location: contacts.location,
      tags: contacts.tags,
      emails: contacts.emails,
      phones: contacts.phones,
      links: contacts.links,
      companyDomain: companies.domain,
      companySector: companies.sector,
      rank: sql<number>`
        ts_rank(${contacts}.search_tsv, to_tsquery('english', ${tsq}))
        + coalesce(ts_rank(${companies}.search_tsv, to_tsquery('english', ${tsq})), 0)
      `,
      trigramMatch: sql<boolean>`(${emailsMatch} or ${phonesMatch} or ${linksMatch} or ${domainMatch})`,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(sql`(
      ${contacts}.search_tsv @@ to_tsquery('english', ${tsq})
      or ${companies}.search_tsv @@ to_tsquery('english', ${tsq})
      or ${emailsMatch} or ${phonesMatch} or ${linksMatch} or ${domainMatch}
    )`);

  return rows.map((row) => ({
    contactId: row.id,
    score: row.rank * SEARCH_WEIGHT_IDENTITY + (row.trigramMatch ? SEARCH_WEIGHT_TRIGRAM : 0),
    match: detailSnippet(words, row),
  }));
}
