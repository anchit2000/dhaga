import { normalizeForMatch } from "@/lib/text-match";

/**
 * Confirm-only clustering over saved contact names (docs/ideas.md #4).
 * People encode context in names ("Anchit JOGET") and surnames cluster into
 * communities ("all Jains"). Pure token-frequency code — deterministic, so
 * no LLM (CLAUDE.md Rule 5). Nothing here writes anything: a cluster becomes
 * a tag or a company link only when the user confirms it, because an
 * unconfirmed guess has no receipt.
 */

export interface ClusterableContact {
  id: string;
  name: string;
  tags: string[];
  companyName: string | null;
}

export interface NameCluster {
  /** Normalized token — dismissal key and the default tag on confirm. */
  key: string;
  /** Most common original casing, for display ("JOGET"). */
  display: string;
  contactIds: string[];
  /** Member names for the preview line. */
  names: string[];
}

/** A whole email or URL pasted into a name field must be excluded before it
 *  gets split apart below — once split on '@'/'.'/'/' its fragments ("com",
 *  "example") look like ordinary tokens and would falsely cluster. */
function isEmailOrUrlLike(word: string): boolean {
  return word.includes("@") || /^https?:/i.test(word);
}

function normalizeToken(raw: string): string | null {
  const token = normalizeForMatch(raw);
  if (token.length < 3) return null;
  if (/^\d+$/.test(token)) return null;
  return token;
}

export function computeNameClusters(
  contacts: ClusterableContact[],
  minSize = 2,
  limit = 20,
): NameCluster[] {
  const groups = new Map<
    string,
    { casings: Map<string, number>; members: Map<string, string> }
  >();

  for (const contact of contacts) {
    // The first space-separated word is the given name — clustering on it
    // ("all Amits") is noise, so it's excluded whole, symbols and all.
    const words = contact.name.trim().split(/\s+/).slice(1);
    const seen = new Set<string>();
    for (const word of words) {
      if (isEmailOrUrlLike(word)) continue;
      // A common part can be joined by punctuation, not just a space
      // ("Anchit-Joget", "Anchit_Joget") — split on any run of non-letter/
      // non-digit characters so "Joget" still clusters with "Raveesh Joget".
      // Splitting (not substring search) keeps "Anchit" from ever matching
      // inside "Sanchit" — only a whole token can be a common part.
      for (const raw of word.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
        const key = normalizeToken(raw);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        // Already annotated with this token — nothing left to suggest.
        if (contact.tags.includes(key)) continue;
        if (contact.companyName?.toLowerCase() === key) continue;
        const group = groups.get(key) ?? { casings: new Map(), members: new Map() };
        group.casings.set(raw, (group.casings.get(raw) ?? 0) + 1);
        group.members.set(contact.id, contact.name);
        groups.set(key, group);
      }
    }
  }

  const clusters: NameCluster[] = [];
  for (const [key, group] of groups) {
    if (group.members.size < minSize) continue;
    const display = [...group.casings.entries()].sort((a, b) => b[1] - a[1])[0][0];
    clusters.push({
      key,
      display,
      contactIds: [...group.members.keys()],
      names: [...group.members.values()],
    });
  }
  return clusters
    .sort((a, b) => b.contactIds.length - a.contactIds.length)
    .slice(0, limit);
}
