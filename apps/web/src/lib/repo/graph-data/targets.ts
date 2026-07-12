import { ilike } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import type { GraphTarget } from "./types";

const TARGET_LIMIT = 8;

/** Typeahead for WarmPathPanel — replaces handing it the entire eager node list. */
export async function searchGraphTargets(query: string): Promise<GraphTarget[]> {
  if (!query.trim()) return [];
  const db = await getDb();
  const like = `%${query.trim()}%`;
  const [contactRows, companyRows] = await Promise.all([
    db.select({ id: contacts.id, name: contacts.name }).from(contacts).where(ilike(contacts.name, like)).limit(TARGET_LIMIT),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(ilike(companies.name, like)).limit(TARGET_LIMIT),
  ]);
  const targets: GraphTarget[] = [
    ...contactRows.map((row): GraphTarget => ({ id: row.id, label: row.name, kind: "contact" })),
    ...companyRows.map((row): GraphTarget => ({ id: row.id, label: row.name, kind: "company" })),
  ];
  return targets.slice(0, TARGET_LIMIT);
}
