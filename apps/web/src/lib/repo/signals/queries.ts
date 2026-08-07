import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, signals, type SignalRow } from "@/lib/db/schema";

export interface SignalItem {
  id: string;
  contactId: string;
  contactName: string;
  companyName: string | null;
  kind: string;
  headline: string;
  detail: string;
  sourceUrl: string | null;
  createdAt: Date;
}

/** All new (undismissed, unconverted) signals across the graph, for Home. */
export async function listNewSignals(): Promise<SignalItem[]> {
  const db = await getDb();
  return db
    .select({
      id: signals.id,
      contactId: signals.contactId,
      contactName: contacts.name,
      companyName: companies.name,
      kind: signals.kind,
      headline: signals.headline,
      detail: signals.detail,
      sourceUrl: signals.sourceUrl,
      createdAt: signals.createdAt,
    })
    .from(signals)
    .innerJoin(contacts, eq(contacts.id, signals.contactId))
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(eq(signals.status, "new"))
    .orderBy(desc(signals.createdAt));
}

export async function listContactSignals(contactId: string): Promise<SignalRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(signals)
    .where(and(eq(signals.contactId, contactId), eq(signals.status, "new")))
    .orderBy(desc(signals.createdAt));
}

export async function getSignal(signalId: string): Promise<SignalRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(signals).where(eq(signals.id, signalId)).limit(1);
  return row ?? null;
}
