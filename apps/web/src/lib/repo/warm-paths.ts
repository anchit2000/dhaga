import { isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { companies, contacts, edges, sessionContacts } from "@/lib/db/schema";

/**
 * Warm-path finding (v1.3): "who can intro me to X?" — pure BFS over the
 * user's own graph, no AI cost. Every contact is first-degree from the user,
 * so a path is: You → contact → … → target.
 */

export interface PathNode {
  id: string;
  label: string;
  kind: "contact" | "company";
}

export interface WarmPath {
  nodes: PathNode[];
}

interface AdjacencyGraph {
  neighbors: Map<string, Set<string>>;
  nodes: Map<string, PathNode>;
}

async function buildGraph(): Promise<AdjacencyGraph> {
  const db = await getDb();
  const [allContacts, allCompanies, allEdges, memberships, sessionRows] =
    await Promise.all([
      db.select({ id: contacts.id, name: contacts.name }).from(contacts),
      db.select({ id: companies.id, name: companies.name }).from(companies),
      db.select().from(edges).where(isNull(edges.deletedAt)),
      db
        .select({ id: contacts.id, companyId: contacts.companyId })
        .from(contacts),
      db
        .select({
          sessionId: sessionContacts.sessionId,
          contactId: sessionContacts.contactId,
        })
        .from(sessionContacts),
    ]);

  const nodes = new Map<string, PathNode>();
  for (const contact of allContacts) {
    nodes.set(contact.id, { id: contact.id, label: contact.name, kind: "contact" });
  }
  for (const company of allCompanies) {
    nodes.set(company.id, { id: company.id, label: company.name, kind: "company" });
  }

  const neighbors = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    if (!nodes.has(a) || !nodes.has(b) || a === b) return;
    (neighbors.get(a) ?? neighbors.set(a, new Set()).get(a)!).add(b);
    (neighbors.get(b) ?? neighbors.set(b, new Set()).get(b)!).add(a);
  };

  for (const edge of allEdges) connect(edge.srcId, edge.dstId);
  for (const member of memberships) {
    if (member.companyId) connect(member.id, member.companyId);
  }
  const bySession = new Map<string, string[]>();
  for (const row of sessionRows) {
    (bySession.get(row.sessionId) ?? bySession.set(row.sessionId, []).get(row.sessionId)!).push(row.contactId);
  }
  for (const attendees of bySession.values()) {
    for (let i = 0; i < attendees.length; i++) {
      for (let j = i + 1; j < attendees.length; j++) {
        connect(attendees[i], attendees[j]);
      }
    }
  }
  return { neighbors, nodes };
}

/**
 * BFS outward from the target; the first time each contact is reached, the
 * reversed path is a warm path (that contact is your way in). Returns up to
 * three shortest paths with distinct entry contacts.
 */
export async function findWarmPaths(targetId: string): Promise<WarmPath[]> {
  const { neighbors, nodes } = await buildGraph();
  if (!nodes.has(targetId)) return [];

  const previous = new Map<string, string | null>([[targetId, null]]);
  const queue = [targetId];
  const paths: WarmPath[] = [];

  while (queue.length > 0 && paths.length < 3) {
    const current = queue.shift()!;
    const node = nodes.get(current)!;
    if (node.kind === "contact" && current !== targetId) {
      // Walking `previous` from the entry contact leads back to the target,
      // so the chain is already ordered contact → … → target.
      const chain: PathNode[] = [];
      for (let at: string | null = current; at != null; at = previous.get(at) ?? null) {
        chain.push(nodes.get(at)!);
      }
      paths.push({ nodes: chain });
      continue; // don't traverse through a found entry contact
    }
    for (const next of neighbors.get(current) ?? []) {
      if (!previous.has(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  return paths;
}
