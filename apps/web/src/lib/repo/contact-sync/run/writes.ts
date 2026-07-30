import type { ContactSyncTarget, SyncableContact } from "@dhaga/core";
import type { ObservedContact, SyncWrite } from "@dhaga/core/src/api/sync";

/** The network half of a run: talking to the provider. No DB access in here. */

const EMPTY_CONTACT: SyncableContact = {
  name: "",
  nickname: null,
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  addresses: [],
  importantDates: [],
};

/** ExternalContact → the wire shape reconcile expects (drops containerId). */
export function toObserved(
  contacts: Awaited<ReturnType<ContactSyncTarget["listChanged"]>>,
): ObservedContact[] {
  return contacts.map(({ containerId: _containerId, ...contact }) => contact);
}

export interface AppliedWrites {
  results: { contactId: string; externalId: string; etag: string | null }[];
  failed: number;
}

/**
 * Apply one batch of writes to the provider, collecting the ids it assigned.
 *
 * A per-write failure is swallowed on purpose: one rejected patch — a stale
 * etag, or a record deleted in Google since we read it — must not abandon the
 * rest of the batch, and the next run re-derives the same write from the base
 * snapshot anyway.
 *
 * What must NOT be lost is the id of a successful create. Until it is
 * acknowledged the link does not exist, so the next run would not recognise its
 * own write and would create the person again, every time.
 *
 * Sequential rather than concurrent: both providers rate-limit per user, and a
 * burst of parallel writes is the fastest way to get a 429 that fails writes
 * which would otherwise have succeeded.
 */
export async function applyWrites(
  target: ContactSyncTarget,
  writes: SyncWrite[],
): Promise<AppliedWrites> {
  const results: AppliedWrites["results"] = [];
  let failed = 0;

  for (const write of writes) {
    try {
      const ref = write.externalId
        ? await target.patch(write.externalId, write.fields, write.etag)
        : await target.create({ ...EMPTY_CONTACT, ...write.fields }, null);
      results.push({ contactId: write.contactId, externalId: ref.externalId, etag: ref.etag });
    } catch {
      // Provider errors can quote the user's contact data, so nothing from the
      // failure is recorded beyond the count — third-party PII must never reach
      // a plaintext server log.
      failed += 1;
    }
  }

  return { results, failed };
}
