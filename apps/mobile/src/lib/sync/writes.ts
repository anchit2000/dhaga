import type { ObservedContact, SyncWrite } from "@dhaga/core/src/api/sync";
import type { ExternalContact, SyncableContact } from "@dhaga/core/src/sync/types";

/**
 * Pure shaping of the two write-application steps, kept out of the engine so
 * they can be tested without a device or a server.
 */

/** A write the client could not apply. Reported, never swallowed. */
export interface SyncWriteFailure {
  contactId: string;
  message: string;
}

/**
 * What actually leaves the phone, written out field by field. The container is
 * dropped — the push contract carries one containerId for the whole batch, so a
 * per-contact copy would be a second source of truth for the same fact — and
 * listing the rest explicitly keeps "only these fields are uploaded" visible at
 * the boundary rather than implied by a spread.
 */
export function toObserved(contacts: readonly ExternalContact[]): ObservedContact[] {
  return contacts.map((contact) => ({
    externalId: contact.externalId,
    etag: contact.etag,
    name: contact.name,
    nickname: contact.nickname,
    title: contact.title,
    company: contact.company,
    emails: contact.emails,
    phones: contact.phones,
    links: contact.links,
    addresses: contact.addresses,
    importantDates: contact.importantDates,
  }));
}

/**
 * A create arrives as a Partial — the server only sends fields it wants
 * written — but creating a record needs a whole contact. Absent fields become
 * empty/null because a brand new record genuinely has none of them; this is
 * not a merge and must never be used to fill an existing record.
 *
 * Returns null when there is no usable name: an address book entry with no
 * name is unfindable by the user, so the write is reported as a failure
 * instead of quietly producing a blank card.
 */
export function createPayload(fields: Partial<SyncableContact>): SyncableContact | null {
  const name = fields.name?.trim() ?? "";
  if (!name) return null;
  return {
    name,
    nickname: fields.nickname ?? null,
    title: fields.title ?? null,
    company: fields.company ?? null,
    emails: fields.emails ?? [],
    phones: fields.phones ?? [],
    links: fields.links ?? [],
    addresses: fields.addresses ?? [],
    importantDates: fields.importantDates ?? [],
  };
}

/** Whether a write creates a new address-book record or edits an existing one. */
export function isCreate(write: SyncWrite): boolean {
  return write.externalId === null;
}
