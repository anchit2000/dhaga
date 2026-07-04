import { isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, edges } from "@/lib/db/schema";

export interface GraphViewNode {
  id: string;
  kind: "contact" | "company";
  label: string;
  sublabel: string | null;
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface GraphViewData {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

/** The whole graph for the browser page: people, companies, typed edges. */
export async function fetchGraphView(): Promise<GraphViewData> {
  const db = await getDb();
  const [allContacts, allCompanies, explicitEdges, memberships] =
    await Promise.all([
      db
        .select({ id: contacts.id, name: contacts.name, title: contacts.title })
        .from(contacts),
      db.select({ id: companies.id, name: companies.name }).from(companies),
      db.select().from(edges).where(isNull(edges.deletedAt)),
      db
        .select({ id: contacts.id, companyId: contacts.companyId })
        .from(contacts)
        .where(isNotNull(contacts.companyId)),
    ]);

  const nodes: GraphViewNode[] = [
    ...allContacts.map((contact) => ({
      id: contact.id,
      kind: "contact" as const,
      label: contact.name,
      sublabel: contact.title,
    })),
    ...allCompanies.map((company) => ({
      id: company.id,
      kind: "company" as const,
      label: company.name,
      sublabel: null,
    })),
  ];
  const nodeIds = new Set(nodes.map((node) => node.id));

  const viewEdges: GraphViewEdge[] = [];
  const seen = new Set<string>();
  for (const member of memberships) {
    const key = `${member.id}→${member.companyId}`;
    if (member.companyId && !seen.has(key)) {
      seen.add(key);
      viewEdges.push({
        id: `member-${key}`,
        source: member.id,
        target: member.companyId,
        label: "works at",
      });
    }
  }
  for (const edge of explicitEdges) {
    if (!nodeIds.has(edge.srcId) || !nodeIds.has(edge.dstId)) continue;
    const key = `${edge.srcId}-${edge.predicate}-${edge.dstId}`;
    if (seen.has(key) || seen.has(`${edge.srcId}→${edge.dstId}`)) continue;
    seen.add(key);
    viewEdges.push({
      id: edge.id,
      source: edge.srcId,
      target: edge.dstId,
      label: edge.predicate.replaceAll("_", " "),
    });
  }

  return { nodes, edges: viewEdges };
}
