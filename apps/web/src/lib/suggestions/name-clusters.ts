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

function normalizeToken(raw: string): string | null {
  const stripped = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const token = normalizeForMatch(stripped);
  if (token.length < 3) return null;
  if (/^\d+$/.test(token)) return null;
  if (raw.includes("@") || /^https?:/i.test(raw)) return null;
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
    // First tokens are given names — clustering them ("all Amits") is noise.
    const tokens = contact.name.trim().split(/\s+/).slice(1);
    const seen = new Set<string>();
    for (const raw of tokens) {
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
