import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { phoneticKeys } from "@dhaga/core/src/voice/teaching/phonetic";
import { getDb } from "@/lib/db/request-scope";
import { voiceVocab, type VoiceVocabRow } from "@/lib/db/schema";
import type { VocabTerm } from "@dhaga/core/src/voice/types";

/**
 * Server-side persistence for a user's taught dictation vocabulary. RLS scopes
 * every row to the caller (packages/ee); the self-host core runs single-user
 * over one unscoped connection — either way this code never mentions user_id.
 *
 * Per-user uniqueness of `term_lc` is enforced here (lookup-then-upsert), not by
 * a DB constraint, so there's no natural-key constraint to juggle across the
 * self-host/EE-RLS split. Every function calls getDb() exactly once — never
 * inside a Promise.all — to avoid the scoped-pool fan-out exhaustion trap.
 */

function toVocabTerm(row: VoiceVocabRow): VocabTerm {
  return {
    term: row.term,
    aliases: row.aliases,
    keys: row.keys,
    boost: row.boost,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

/**
 * Phonetic index for a term + its aliases. Uses the SAME `phoneticKeys` the
 * client store and the on-device dictionary use (@dhaga/core), so a term taught
 * here matches identically at recognition time. Mirrors the defensive key
 * recompute in DoubleMetaphoneDictionary.rebuild.
 */
function computeKeys(term: string, aliases: string[]): string[] {
  const keys = new Set<string>(phoneticKeys(term));
  for (const alias of aliases) {
    for (const key of phoneticKeys(alias)) keys.add(key);
  }
  return [...keys];
}

/** Every taught term, oldest first. */
export async function listVocab(): Promise<VocabTerm[]> {
  const db = await getDb();
  const rows = await db.select().from(voiceVocab).orderBy(voiceVocab.createdAt);
  return rows.map(toVocabTerm);
}

/**
 * Insert-or-update the term keyed by its lowercased spelling. `keys` are
 * recomputed on every write. An omitted `boost` keeps the existing value on
 * update and falls to the column default (8) on insert.
 */
export async function upsertVocab(
  term: string,
  aliases: string[] = [],
  boost?: number,
): Promise<VocabTerm> {
  const db = await getDb();
  const canonical = term.trim();
  const termLc = canonical.toLowerCase();
  const keys = computeKeys(canonical, aliases);

  const [existing] = await db
    .select()
    .from(voiceVocab)
    .where(eq(voiceVocab.termLc, termLc))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(voiceVocab)
      .set({
        term: canonical,
        aliases,
        keys,
        boost: boost ?? existing.boost,
        updatedAt: new Date(),
      })
      .where(eq(voiceVocab.id, existing.id))
      .returning();
    return toVocabTerm(updated);
  }

  const values: typeof voiceVocab.$inferInsert = {
    id: randomUUID(),
    term: canonical,
    termLc,
    aliases,
    keys,
  };
  if (boost !== undefined) values.boost = boost;
  const [inserted] = await db.insert(voiceVocab).values(values).returning();
  return toVocabTerm(inserted);
}

/** Remove one taught term (matched case-insensitively by its spelling). */
export async function removeVocab(term: string): Promise<void> {
  const db = await getDb();
  await db.delete(voiceVocab).where(eq(voiceVocab.termLc, term.trim().toLowerCase()));
}

/** Drop every taught term — also the user-level cleanup for account deletion. */
export async function clearVocab(): Promise<void> {
  const db = await getDb();
  await db.delete(voiceVocab);
}
