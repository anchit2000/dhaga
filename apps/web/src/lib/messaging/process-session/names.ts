/**
 * Guess, WITHOUT an LLM, which names a batch might be talking about — purely to
 * decide which existing contacts to show the planner as candidates.
 *
 * This is a recall filter, not a decision. It only has to be generous enough
 * that the real person is in the candidate pool; the planner is what decides
 * whether any candidate is actually the same human. So it errs toward too many
 * names (cheap: one extra OR in one query) rather than too few (expensive: the
 * planner never sees the existing contact and creates a duplicate person).
 *
 * Deliberately not an AI call: it runs before the planning call and would
 * otherwise double the batch's cost to answer a question a regex can answer.
 */

/** Words that start a sentence and get capitalised without being names. Kept
 *  small on purpose — a false positive costs one wasted OR clause, while a
 *  missed name costs a duplicate contact. */
const SENTENCE_STARTERS = new Set([
  "a", "an", "and", "based", "but", "create", "he", "his", "her", "i", "if", "in", "introduced",
  "is", "it", "me", "my", "no", "not", "on", "or", "she", "the", "their", "they", "this", "to",
  "was", "we", "when", "yes", "you", "your",
]);

/** Cap on names fed to the candidate query. A batch naming more people than this
 *  is already past MESSAGING_MAX_OPEN_ITEMS territory, and an unbounded OR list
 *  would turn one cheap query into a table scan. */
const MAX_NAMES = 12;

/**
 * Capitalised word runs that look like personal names ("Priya Raman", "Ajay
 * Shrivastava"), plus their bare first words so a note that says only "Priya"
 * still pulls the Priyas into the pool.
 */
export function guessNames(texts: readonly string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    for (const run of capitalizedRuns(text)) {
      found.add(run);
      const first = run.split(" ")[0];
      if (first && first !== run) found.add(first);
      if (found.size >= MAX_NAMES) return [...found].slice(0, MAX_NAMES);
    }
  }
  return [...found].slice(0, MAX_NAMES);
}

/**
 * Runs of 1–3 capitalised words. Unicode-aware (`\p{Lu}`/`\p{L}` with the `u`
 * flag) because this product's users are not all writing in Latin script and a
 * naive [A-Z] would quietly never match a whole class of names.
 */
function capitalizedRuns(text: string): string[] {
  const runs: string[] = [];
  // Bounded repetition, never a nested quantifier over an unbounded group: this
  // runs on arbitrary forwarded text, and this repo has shipped a polynomial
  // backtracking regex before (see the CodeQL trailing-slash findings).
  const pattern = /\p{Lu}\p{L}*(?:[ ]\p{Lu}\p{L}*){0,2}/gu;
  for (const match of text.matchAll(pattern)) {
    const run = match[0].trim();
    if (run.length < 2) continue;
    const words = run.split(" ");
    // Drop a lone capitalised word that is just a sentence opener; keep it when
    // it is part of a multi-word run, where "No" in "No Priya Raman" is trimmed
    // by the starter check on the run's own first word instead.
    const trimmed = SENTENCE_STARTERS.has(words[0].toLocaleLowerCase()) ? words.slice(1) : words;
    if (trimmed.length === 0) continue;
    const candidate = trimmed.join(" ");
    if (candidate.length >= 2) runs.push(candidate);
  }
  return runs;
}
