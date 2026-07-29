import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { contacts, positions } from "@/lib/db/schema";
import { createContactProfile, findOrCreateCompany } from "@/lib/repo/contacts";
import type { SyncableContact, SyncField } from "@dhaga/core";
import type { DhagaDb } from "@/lib/db";

/** Company NAME → companies FK, memoized per sync run. findOrCreateCompany opens
 *  its own transaction (advisory lock), so repeat employers must not re-enter it
 *  once per contact — the same memo resolvePositions keeps in repo/contacts. */
export type CompanyMemo = Map<string, string>;

async function resolveCompanyId(name: string | null, memo: CompanyMemo): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  const cached = memo.get(key);
  if (cached) return cached;
  const id = await findOrCreateCompany(trimmed);
  memo.set(key, id);
  return id;
}

/**
 * Mirror a synced title/company onto the primary position row.
 *
 * `positions` is the source of truth for employment and contacts.title /
 * company_id are its denormalised mirror, so writing only the mirror would
 * leave the two disagreeing — and the next profile save (which rebuilds the
 * mirror from positions) would silently revert the synced value.
 */
async function syncPrimaryPosition(
  db: DhagaDb,
  contactId: string,
  patch: { title?: string | null; companyId?: string | null },
): Promise<void> {
  const rows = await db
    .select({ id: positions.id, isCurrent: positions.isCurrent })
    .from(positions)
    .where(eq(positions.contactId, contactId))
    .orderBy(asc(positions.sortOrder));
  const primary = rows.find((row) => row.isCurrent) ?? rows[0];
  if (primary) {
    await db.update(positions).set(patch).where(eq(positions.id, primary.id));
    return;
  }
  if (!patch.title && !patch.companyId) return;
  await db.insert(positions).values({
    id: randomUUID(),
    contactId,
    companyId: patch.companyId ?? null,
    title: patch.title ?? null,
    isCurrent: true,
    sortOrder: 0,
  });
}

/**
 * Apply the merge result's `changedLocally` fields to a Dhaga contact — ONLY
 * those fields. Partial by contract, exactly like the outbound writes: a field
 * neither side moved is never rewritten, so sync can never clobber data it does
 * not manage.
 */
export async function applySyncedContact(
  db: DhagaDb,
  contactId: string,
  merged: SyncableContact,
  fields: readonly SyncField[],
  memo: CompanyMemo,
): Promise<void> {
  const changed = new Set<SyncField>(fields);
  const values: Partial<typeof contacts.$inferInsert> = { updatedAt: new Date() };
  // A blank name would make the contact unfindable; the merge can only produce
  // one from a blank remote, so treat it as "no name change" rather than data.
  if (changed.has("name") && merged.name.trim()) values.name = merged.name.trim();
  if (changed.has("nickname")) values.nickname = merged.nickname;
  if (changed.has("emails")) values.emails = merged.emails;
  if (changed.has("phones")) values.phones = merged.phones;
  if (changed.has("links")) values.links = merged.links;
  if (changed.has("addresses")) values.addresses = merged.addresses;
  if (changed.has("importantDates")) values.importantDates = merged.importantDates;
  if (changed.has("title")) values.title = merged.title;
  let companyId: string | null | undefined;
  if (changed.has("company")) {
    companyId = await resolveCompanyId(merged.company, memo);
    values.companyId = companyId;
  }
  await db.update(contacts).set(values).where(eq(contacts.id, contactId));
  if (changed.has("title") || changed.has("company")) {
    await syncPrimaryPosition(db, contactId, {
      ...(changed.has("title") ? { title: merged.title } : {}),
      ...(changed.has("company") ? { companyId: companyId ?? null } : {}),
    });
  }
}

/**
 * Create a Dhaga contact from one the client observed. Routed through
 * createContactProfile so a sync-created contact goes through the same single
 * write choke point as every other importer (mentioned-stub promotion,
 * company resolution, positions). `skipWebhook` keeps the per-contact fetch out
 * of the scoped connection — the caller emits one event for the batch instead.
 */
export async function createSyncedContact(contact: SyncableContact): Promise<string> {
  const hasRole = Boolean(contact.title || contact.company);
  return createContactProfile(
    {
      name: contact.name,
      nickname: contact.nickname,
      positions: hasRole
        ? [
            {
              title: contact.title,
              company: contact.company,
              department: null,
              current: true,
              startedAt: null,
              endedAt: null,
              note: null,
              relation: null,
            },
          ]
        : [],
      emails: contact.emails,
      phones: contact.phones,
      links: contact.links,
      addresses: contact.addresses,
      importantDates: contact.importantDates,
      customFields: [],
      location: null,
    },
    "import",
    { skipWebhook: true },
  );
}
