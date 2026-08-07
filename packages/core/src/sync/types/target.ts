import type { SyncableContact, SyncField } from "./contact";
import type { ChangedContactsPage, ExternalContact, ExternalRef, SyncContainer } from "./external";

/**
 * Provider-agnostic contract for an address book Dhaga can sync with — the
 * same gateway shape as LLMClient / SearchClient / MessagingClient. Adding
 * CardDAV or a new provider is a new implementation plus one registry call,
 * with zero changes to callers.
 *
 * `patch` is partial by contract: it must write ONLY the supplied fields and
 * leave every other field on the remote record untouched. That is what makes
 * field-level ownership safe — Dhaga never round-trips a whole record and so
 * can never clobber a field it does not manage.
 */
export interface ContactSyncTarget {
  readonly id: string;
  /**
   * Fields this target's data model cannot represent, and which must therefore
   * be excluded from the merge entirely.
   *
   * Absent (the normal case) means the target round-trips all nine. Declaring a
   * field here is not a soft "best effort" — it is load-bearing. A target that
   * silently reports a field as empty because it cannot store it would have the
   * merge honour that emptiness as a DELETION on the second run, once the base
   * snapshot recorded the field as synced. Microsoft Graph is the live example:
   * one url slot, and `birthday` as the only date.
   */
  readonly unsupportedFields?: readonly SyncField[];
  listContainers(): Promise<SyncContainer[]>;
  listChanged(since: Date | null): Promise<ExternalContact[]>;
  /**
   * Enumerate incrementally from the provider's own opaque cursor, returning a
   * fresh one. `null` means "no cursor yet" and must answer with a `"full"`
   * page that also mints one.
   *
   * OPTIONAL, and it stays optional: the mobile device target has no cursor to
   * offer — neither expo-contacts API exposes a modified-since query — and
   * making this required would break it for no gain. A target without it is
   * simply always enumerated in full via `listChanged`, exactly as before.
   *
   * Implementations MUST recover from an expired cursor by re-enumerating in
   * full and returning `mode: "full"`, never by surfacing the expiry as a run
   * failure.
   */
  listChangedSince?(cursor: string | null): Promise<ChangedContactsPage>;
  create(contact: SyncableContact, containerId: string | null): Promise<ExternalRef>;
  patch(
    externalId: string,
    fields: Partial<SyncableContact>,
    etag: string | null,
  ): Promise<ExternalRef>;
}
