import { File, Paths } from "expo-file-system";

import { phoneticKeys } from "@dhaga/core/src/voice/teaching/phonetic";
import type { VocabStore } from "@dhaga/core/src/voice/teaching/types";
import type { VocabTerm } from "@dhaga/core/src/voice/types";

import { VOCAB_DEFAULT_BOOST, VOCAB_STORE_FILE } from "@/utils/constants";

/**
 * Per-user voice vocabulary, persisted so taught spellings survive reloads and
 * work fully offline (CLAUDE.md architecture principle #1, local-first). Same
 * per-store CRUD shape as pending-capture.ts: the whole array is (re)written
 * atomically to a document-directory JSON file on every change, so it's safe
 * from OS cache eviction and never partially written.
 *
 * The deterministic phonetic index lives in @dhaga/core; this store only owns
 * persistence and recomputing each term's phonetic `keys` on write, so the
 * loaded terms are always ready for DoubleMetaphoneDictionary.rebuild().
 */
const vocabFile = new File(Paths.document, VOCAB_STORE_FILE);

/** Phonetic keys for a term plus all of its aliases, deduped. */
function keysFor(term: string, aliases: string[]): string[] {
  const keys = new Set<string>(phoneticKeys(term));
  for (const alias of aliases) {
    for (const key of phoneticKeys(alias)) keys.add(key);
  }
  return [...keys];
}

/** Trim, drop empties, and de-duplicate a list of surface forms. */
function normalizeAliases(aliases: string[]): string[] {
  return [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))];
}

async function load(): Promise<VocabTerm[]> {
  try {
    if (!vocabFile.exists) return [];
    const parsed: unknown = JSON.parse(await vocabFile.text());
    return Array.isArray(parsed) ? (parsed as VocabTerm[]) : [];
  } catch {
    // Missing/corrupt store — treat as nothing taught.
    return [];
  }
}

function write(terms: VocabTerm[]): void {
  try {
    if (terms.length === 0) {
      if (vocabFile.exists) vocabFile.delete();
      return;
    }
    vocabFile.write(JSON.stringify(terms));
  } catch {
    // Best-effort: a failed persist just means this edit won't survive a reload.
  }
}

/**
 * Add a term or merge into an existing one (matched case-insensitively on the
 * canonical spelling). Aliases union; boost/keys/updatedAt are refreshed.
 */
async function upsert(term: string, aliases: string[] = [], boost?: number): Promise<VocabTerm> {
  const canonical = term.trim();
  const terms = await load();
  const existing = terms.find((entry) => entry.term.toLowerCase() === canonical.toLowerCase());
  const mergedAliases = normalizeAliases([...(existing?.aliases ?? []), ...aliases]);
  const now = Date.now();
  const next: VocabTerm = {
    term: canonical,
    aliases: mergedAliases,
    keys: keysFor(canonical, mergedAliases),
    boost: boost ?? existing?.boost ?? VOCAB_DEFAULT_BOOST,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  write([...terms.filter((entry) => entry !== existing), next]);
  return next;
}

async function remove(term: string): Promise<void> {
  const canonical = term.trim().toLowerCase();
  write((await load()).filter((entry) => entry.term.toLowerCase() !== canonical));
}

async function clear(): Promise<void> {
  write([]);
}

export const vocabStore: VocabStore = { load, upsert, remove, clear };
