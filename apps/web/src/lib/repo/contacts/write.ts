import { randomUUID } from "node:crypto";
import { and, eq, ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, positions } from "@/lib/db/schema";
import { emitWebhook } from "@/lib/webhooks";
import { normalizeContactMethods, profileFromExtracted } from "@dhaga/core";
import type { ContactProfile, ExtractedContact, Position } from "@dhaga/core";
import type { ContactSource } from "@/utils/constants/app";

/**
 * Two concurrent callers naming the same company (two note extractions, or
 * a CSV import processing repeated employer names) must not race the
 * select-then-insert below into creating duplicate company rows. There's no
 * unique constraint on companies.name to fall back on with ON CONFLICT — DDL
 * runs idempotently on every boot (lib/db/ddl/core/), and adding one would
 * fail on any self-hosted install that already has duplicate names. Instead,
 * take a transaction-scoped Postgres advisory lock keyed on the
 * case-insensitive name: it serializes concurrent calls for the SAME name
 * (the second blocks until the first's transaction commits, then its own
 * SELECT sees the row the first just inserted) without touching the schema.
 */
export async function findOrCreateCompany(name: string): Promise<string> {
  const db = await getDb();
  const trimmed = name.trim();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${trimmed.toLowerCase()}))`,
    );
    // TODO(search-index): route through getSearchIndex() (matchMode: "exact")
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(ilike(companies.name, trimmed))
      .limit(1);
    if (existing) return existing.id;
    const id = randomUUID();
    await tx.insert(companies).values({ id, name: trimmed });
    return id;
  });
}

type ResolvedPosition = { position: Position; companyId: string | null };

/** Resolve each position's company to a companies row. SEQUENTIAL, not
 *  Promise.all: findOrCreateCompany opens its own connection+transaction, so a
 *  concurrent fan-out checked out one tenant-pool connection per position and a
 *  multi-job contact exhausted the max-3 pool (a server action gets no React
 *  cache() getDb() dedupe). The name→id memo collapses repeat companies. */
async function resolvePositions(list: Position[]): Promise<ResolvedPosition[]> {
  const byName = new Map<string, string | null>();
  const out: ResolvedPosition[] = [];
  for (const position of list) {
    const name = position.company?.trim();
    if (name && !byName.has(name)) byName.set(name, await findOrCreateCompany(name));
    out.push({ position, companyId: name ? byName.get(name) ?? null : null });
  }
  return out;
}

/** Contact-row values from a profile. The primary position (first current,
 *  else the first listed) mirrors into the denormalised title/company_id. */
function contactValues(input: ContactProfile, resolved: ResolvedPosition[]) {
  const current = input.positions.findIndex((p) => p.current);
  const primaryIndex = current >= 0 ? current : input.positions.length > 0 ? 0 : -1;
  const primary = primaryIndex >= 0 ? input.positions[primaryIndex] : null;
  return {
    name: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    title: primary?.title?.trim() || null,
    companyId: primaryIndex >= 0 ? resolved[primaryIndex].companyId : null,
    emails: normalizeContactMethods(input.emails),
    phones: normalizeContactMethods(input.phones),
    links: normalizeContactMethods(input.links),
    addresses: input.addresses,
    importantDates: input.importantDates,
    customFields: input.customFields,
    location: input.location?.trim() || null,
    updatedAt: new Date(),
  };
}

function positionRows(contactId: string, resolved: ResolvedPosition[]) {
  return resolved.map(({ position, companyId }, index) => ({
    id: randomUUID(),
    contactId,
    companyId,
    title: position.title?.trim() || null,
    department: position.department?.trim() || null,
    isCurrent: position.current,
    startedAt: position.startedAt?.trim() || null,
    endedAt: position.endedAt?.trim() || null,
    note: position.note?.trim() || null,
    sortOrder: index,
  }));
}

/**
 * Create a contact from the full editable profile. A newly-saved contact that
 * matches exactly one existing "mentioned" stub by name is promoted in place
 * (the stub gets its first real details) rather than duplicated. This is the
 * single choke point for the manual add form and any importer that carries
 * the rich shape.
 */
export async function createContactProfile(
  input: ContactProfile,
  source: ContactSource,
  // skipWebhook: bulk import fires one contacts.imported event, not one per row.
  options?: { skipWebhook?: boolean },
): Promise<string> {
  const db = await getDb();
  const resolved = await resolvePositions(input.positions);
  // TODO(search-index): route through getSearchIndex() (matchMode: "exact")
  const mentioned = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.source, "mentioned"), ilike(contacts.name, input.name.trim())))
    .limit(2);
  const id = mentioned.length === 1 ? mentioned[0].id : randomUUID();
  const values = contactValues(input, resolved);
  await db.transaction(async (tx) => {
    if (mentioned.length === 1) {
      await tx.update(contacts).set({ ...values, source }).where(eq(contacts.id, id));
      await tx.delete(positions).where(eq(positions.contactId, id));
    } else {
      await tx.insert(contacts).values({ id, ...values, source, tags: [] });
    }
    const rows = positionRows(id, resolved);
    if (rows.length > 0) await tx.insert(positions).values(rows);
  });
  if (!options?.skipWebhook) {
    await emitWebhook("contact.created", { id, name: values.name, source });
  }
  return id;
}

/**
 * Capture/extraction/import entry point. Keeps the lean ExtractedContact
 * signature every handler and test uses; lifts it into the rich profile (a
 * single current position, unlabeled methods) so both paths share one writer.
 */
export async function createContact(
  input: ExtractedContact,
  source: ContactSource,
  options?: { skipWebhook?: boolean },
): Promise<string> {
  return createContactProfile(profileFromExtracted(input), source, options);
}

/** Update an existing contact from the edit form. Positions are the source of
 *  truth, so they're replaced wholesale (the form submits the full list). */
export async function updateContact(id: string, input: ContactProfile): Promise<void> {
  const db = await getDb();
  const resolved = await resolvePositions(input.positions);
  const values = contactValues(input, resolved);
  await db.transaction(async (tx) => {
    await tx.update(contacts).set(values).where(eq(contacts.id, id));
    await tx.delete(positions).where(eq(positions.contactId, id));
    const rows = positionRows(id, resolved);
    if (rows.length > 0) await tx.insert(positions).values(rows);
  });
  await emitWebhook("contact.updated", { id, name: values.name });
}
