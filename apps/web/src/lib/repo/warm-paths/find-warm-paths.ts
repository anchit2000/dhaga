import { WARM_PATH_MAX_HOPS } from "@/utils/constants/graph";
import { expandHop, loadNode, reconstruct } from "./expand-hop";
import type { WarmPath } from "./types";

/**
 * Warm-path finding (v1.3): "who can intro me to X?" — bounded BFS over the
 * user's own graph, no AI cost. Every contact is first-degree from the user,
 * so a path is: You → contact → … → target.
 *
 * Loads only the neighborhood actually reachable from the target, hop by
 * hop (never the whole contacts/companies/edges/session_contacts tables),
 * using contacts_companyId_name_idx, edges_srcId_idx/edges_dstId_idx, and
 * session_contacts_contactId_idx (see expand-hop.ts).
 *
 * BFS outward from the target; the first time each contact is reached, the
 * reversed path is a warm path (that contact is your way in). Returns up to
 * three shortest paths with distinct entry contacts.
 */
export async function findWarmPaths(
  targetId: string,
  maxHops = WARM_PATH_MAX_HOPS,
): Promise<WarmPath[]> {
  const target = await loadNode(targetId);
  if (!target) return [];

  const visited = new Map([[targetId, target]]);
  const previous = new Map<string, string | null>([[targetId, null]]);
  const paths: WarmPath[] = [];

  let contactFrontier = target.kind === "contact" ? [targetId] : [];
  let companyFrontier = target.kind === "company" ? [targetId] : [];

  for (
    let hop = 0;
    hop < maxHops && paths.length < 3 && (contactFrontier.length > 0 || companyFrontier.length > 0);
    hop++
  ) {
    const byFrom = await expandHop(contactFrontier, companyFrontier);
    const newCompanies: string[] = [];
    for (const [from, candidates] of byFrom) {
      for (const { to, kind, label } of candidates) {
        if (visited.has(to)) continue;
        visited.set(to, { id: to, label, kind });
        previous.set(to, from);
        if (kind === "contact") {
          // Contacts are always terminal: once found, they're recorded as an
          // entry and never re-expanded. This is load-bearing for the
          // shortest-path-preference test (a farther contact reachable only
          // *through* another contact must never be discovered) — don't
          // remove without re-checking __tests__/warm-paths.test.ts.
          if (paths.length < 3) paths.push(reconstruct(to, previous, visited));
        } else {
          newCompanies.push(to);
        }
      }
    }
    contactFrontier = [];
    companyFrontier = newCompanies;
  }
  return paths.slice(0, 3);
}
