import { sql, type SQL } from "drizzle-orm";
import { SEARCH_HEADLINE_OPTS, NAME_FUZZY_MATCH_THRESHOLD } from "@/utils/constants/search";
import { buildTsQuery } from "../../tokenize";

/**
 * The single UNION ALL that folds every keyword source into one round-trip.
 * Every branch joins contact/company identity (name/title/company) onto its
 * rows, so hybridSearch's separate identity lookup folds in too, and every
 * branch projects the SAME column list/types (non-identity branches NULL the
 * identity-only detail columns). Scoring inputs — each branch's raw `ts_rank`,
 * plus the identity branch's `word_similarity` name-typo score and trigram
 * flag — are emitted raw; per-source weights are applied by the caller.
 *
 * Callers guarantee `words` is non-empty. `words` is already restricted to
 * `\p{L}\p{N}` by queryWords, so the ILIKE patterns and tsquery are safe, and
 * every interpolation here binds as a parameter regardless.
 */
export function buildCombinedKeywordQuery(words: string[]): SQL {
  const tsq = buildTsQuery(words);
  const q = sql`to_tsquery('english', ${tsq})`;
  const headline = (text: SQL): SQL =>
    sql`ts_headline('english', ${text}, ${q}, ${SEARCH_HEADLINE_OPTS})`;

  const anyIlike = (col: SQL): SQL =>
    sql.join(words.map((w) => sql`${col} ILIKE ${`%${w}%`}`), sql` or `);
  const emailsMatch = anyIlike(sql`c.emails::text`);
  const phonesMatch = anyIlike(sql`c.phones::text`);
  const linksMatch = anyIlike(sql`c.links::text`);
  const domainMatch = anyIlike(sql`co.domain`);
  const nameSimSum = sql.join(
    words.map((w) => sql`word_similarity(${w}, lower(c.name))`),
    sql` + `,
  );
  const nameFuzzy = sql.join(
    words.map((w) => sql`word_similarity(${w}, lower(c.name)) > ${NAME_FUZZY_MATCH_THRESHOLD}`),
    sql` or `,
  );

  // Non-identity branches carry NULLs for the identity-only detail columns so
  // every branch of the UNION shares one column list/types.
  const nullDetails = sql`NULL::text, NULL::jsonb, NULL::jsonb, NULL::jsonb, NULL::jsonb, NULL::text, NULL::text`;
  const identityCols = sql`c.name, c.title, co.name`;

  return sql`
    SELECT contact_id, source, rank, trigram_match, snippet,
           c_name, c_title, c_company_name,
           i_location, i_tags, i_emails, i_phones, i_links, i_company_domain, i_company_sector
    FROM (
      SELECT c.id AS contact_id, 'identity' AS source,
             (ts_rank(c.search_tsv, ${q}) + coalesce(ts_rank(co.search_tsv, ${q}), 0) + (${nameSimSum})) AS rank,
             (${emailsMatch} or ${phonesMatch} or ${linksMatch} or ${domainMatch}) AS trigram_match,
             NULL::text AS snippet,
             c.name AS c_name, c.title AS c_title, co.name AS c_company_name,
             c.location AS i_location, c.tags AS i_tags, c.emails AS i_emails,
             c.phones AS i_phones, c.links AS i_links, co.domain AS i_company_domain, co.sector AS i_company_sector
      FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.search_tsv @@ ${q}
         OR co.search_tsv @@ ${q}
         OR ${emailsMatch} OR ${phonesMatch} OR ${linksMatch} OR ${domainMatch}
         OR ${nameFuzzy}

      UNION ALL
      SELECT n.contact_id, 'notes', ts_rank(n.search_tsv, ${q}), false, ${headline(sql`n.body`)},
             ${identityCols}, ${nullDetails}
      FROM notes n JOIN contacts c ON c.id = n.contact_id LEFT JOIN companies co ON c.company_id = co.id
      WHERE n.contact_id IS NOT NULL AND n.deleted_at IS NULL AND n.search_tsv @@ ${q}

      UNION ALL
      SELECT f.contact_id, 'facts', ts_rank(f.search_tsv, ${q}), false, ${headline(sql`f.text`)},
             ${identityCols}, ${nullDetails}
      FROM facts f JOIN contacts c ON c.id = f.contact_id LEFT JOIN companies co ON c.company_id = co.id
      WHERE f.deleted_at IS NULL AND f.search_tsv @@ ${q}

      UNION ALL
      SELECT fu.contact_id, 'followups', ts_rank(fu.search_tsv, ${q}), false,
             ${headline(sql`fu.action || coalesce(' — ' || fu.due_hint, '')`)},
             ${identityCols}, ${nullDetails}
      FROM follow_ups fu JOIN contacts c ON c.id = fu.contact_id LEFT JOIN companies co ON c.company_id = co.id
      WHERE fu.status = 'open' AND fu.search_tsv @@ ${q}

      UNION ALL
      SELECT ec.contact_id, 'events', ts_rank(ev.search_tsv, ${q}), false, ev.name,
             ${identityCols}, ${nullDetails}
      FROM event_contacts ec
      JOIN events ev ON ev.id = ec.event_id
      JOIN contacts c ON c.id = ec.contact_id
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE ev.search_tsv @@ ${q}

      UNION ALL
      SELECT s.contact_id, 'signals', ts_rank(s.search_tsv, ${q}), false,
             ${headline(sql`s.headline || '. ' || s.detail`)},
             ${identityCols}, ${nullDetails}
      FROM signals s JOIN contacts c ON c.id = s.contact_id LEFT JOIN companies co ON c.company_id = co.id
      WHERE s.status = 'new' AND s.search_tsv @@ ${q}
    ) matched
  `;
}
