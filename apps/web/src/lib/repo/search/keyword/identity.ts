import { eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { NAME_FUZZY_MATCH_THRESHOLD, type SearchWeights } from "@/utils/constants/search";
import { buildTsQuery } from "../tokenize";
import { methodValues } from "@dhaga/core";
import type { ContactMethod } from "@dhaga/core";
import type { KeywordHit } from "./types";

/** OR of `column ILIKE '%word%'` per word — trigram-indexed, so this stays
 *  index-backed even though it's a leading-wildcard pattern. Callers
 *  guarantee `words` is non-empty, so `or()` never returns undefined. */
function anyFragmentMatches(column: SQL, words: string[]): SQL {
  return or(...words.map((word) => ilike(column, `%${word}%`))) as SQL;
}

/** OR of a `word_similarity` typo check per word against the lowercased
 *  name — catches transpositions/substitutions prefix tsquery can't (e.g.
 *  "Amchit" finding "Anchit"). `word_similarity` (not plain `similarity`)
 *  scores the word against its best-matching substring of the name, so a
 *  first-name typo isn't diluted by an unrelated surname. Not GIN-backed —
 *  a per-row function call, fine at one user's contact-list scale. */
function anyNameSimilarity(words: string[]): SQL {
  return or(
    ...words.map(
      (word) =>
        sql`word_similarity(${word}, lower(${contacts.name})) > ${NAME_FUZZY_MATCH_THRESHOLD}`,
    ),
  ) as SQL;
}

/** Summed `word_similarity` score per word, folded into `identity`'s rank
 *  alongside ts_rank — same additive scoring model, same weight bucket. */
function nameSimilarityScore(words: string[]): SQL {
  return sql.join(
    words.map((word) => sql`word_similarity(${word}, lower(${contacts.name}))`),
    sql` + `,
  );
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
    emails: ContactMethod[];
    phones: ContactMethod[];
    links: ContactMethod[];
    companyDomain: string | null;
    companySector: string | null;
  },
): string | undefined {
  const location = firstMatch(words, row.location);
  if (location) return `location: ${location}`;
  const tag = firstArrayMatch(words, row.tags);
  if (tag) return `tag: ${tag}`;
  const email = firstArrayMatch(words, methodValues(row.emails));
  if (email) return `email: ${email}`;
  const phone = firstArrayMatch(words, methodValues(row.phones));
  if (phone) return `phone: ${phone}`;
  const link = firstArrayMatch(words, methodValues(row.links));
  if (link) return `link: ${link}`;
  const domain = firstMatch(words, row.companyDomain);
  if (domain) return `company: ${domain}`;
  const sector = firstMatch(words, row.companySector);
  if (sector) return `sector: ${sector}`;
  return undefined;
}

/**
 * contacts + companies: name/title/location/tags and company name/sector
 * via tsvector rank, plus a word_similarity fuzzy pass on name for typos;
 * emails/phones/links/company domain via trigram fragment match, since
 * Postgres tokenizes an email or URL as a single lexeme — "freightline"
 * alone never matches "rohan@freightline.com" through tsvector.
 */
export async function contactAndCompanyHits(
  words: string[],
  weights: SearchWeights,
): Promise<KeywordHit[]> {
  if (words.length === 0) return [];
  const db = await getDb();
  const tsq = buildTsQuery(words);
  const emailsMatch = anyFragmentMatches(sql`${contacts.emails}::text`, words);
  const phonesMatch = anyFragmentMatches(sql`${contacts.phones}::text`, words);
  const linksMatch = anyFragmentMatches(sql`${contacts.links}::text`, words);
  const domainMatch = anyFragmentMatches(sql`${companies.domain}`, words);
  const nameFuzzyMatch = anyNameSimilarity(words);

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
        + (${nameSimilarityScore(words)})
      `,
      trigramMatch: sql<boolean>`(${emailsMatch} or ${phonesMatch} or ${linksMatch} or ${domainMatch})`,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(sql`(
      ${contacts}.search_tsv @@ to_tsquery('english', ${tsq})
      or ${companies}.search_tsv @@ to_tsquery('english', ${tsq})
      or ${emailsMatch} or ${phonesMatch} or ${linksMatch} or ${domainMatch}
      or ${nameFuzzyMatch}
    )`);

  return rows.map((row) => ({
    contactId: row.id,
    score: row.rank * weights.identity + (row.trigramMatch ? weights.trigram : 0),
    match: detailSnippet(words, row),
  }));
}
