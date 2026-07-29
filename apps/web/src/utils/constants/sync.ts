/**
 * Two-way contact-sync limits and vocabulary (wire contract:
 * packages/core/src/api/sync.ts).
 */
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { SyncConflict, SyncField } from "@dhaga/core/src/sync/types";

/** Address books Dhaga can reconcile against — mirrors ContactSyncProviderId. */
export const CONTACT_SYNC_PROVIDERS = [
  "device",
  "google",
  "microsoft",
] as const satisfies readonly ContactSyncProviderId[];

/**
 * The two payload ceilings are re-exported rather than defined here: the mobile
 * client chunks its push to SYNC_MAX_CONTACTS and this server rejects anything
 * larger, so the number has to have exactly one home (packages/core).
 */
export { SYNC_MAX_CONTACTS, SYNC_MAX_OBSERVED_IDS } from "@dhaga/core/src/api/sync-limits";

/**
 * Max creates offered back to the client in one run when the caller asks for
 * unlinked Dhaga contacts to be pushed outward. A first sync of a large graph
 * spreads over several runs rather than handing a phone thousands of writes.
 */
export const SYNC_MAX_CREATES = 500;

/** Max results accepted in one ack call. */
export const SYNC_MAX_ACK_RESULTS = 1000;

/** A live link: the pair is present on both sides and reconciles every run. */
export const SYNC_LINK_LINKED = "linked";

/**
 * A tombstone: the row is kept so the contact is never re-created on that
 * provider. Two producers set it — a full batch that no longer contains the
 * external record (deleted on the device), and, once the UI exists, a user
 * severing the link by hand. Both want the same outcome, so they share a state.
 */
export const SYNC_LINK_UNLINKED = "unlinked";

/**
 * How the user settled a stored conflict. "dhaga" writes the value Dhaga lost
 * back onto the contact (the next sync then carries it to the phone, because
 * Dhaga becomes the side that moved); "phone" simply accepts what already won.
 * Both then drop the entry — resolving is the only way a conflict leaves the
 * row other than the divergence disappearing on its own.
 */
export const SYNC_CONFLICT_KEEP_DHAGA = "dhaga";
export const SYNC_CONFLICT_KEEP_PHONE = "phone";
export const SYNC_CONFLICT_CHOICES = [
  SYNC_CONFLICT_KEEP_DHAGA,
  SYNC_CONFLICT_KEEP_PHONE,
] as const;
export type SyncConflictChoice = (typeof SYNC_CONFLICT_CHOICES)[number];

/** Field names as the user knows them, not as the wire calls them. */
export const SYNC_FIELD_LABELS: Record<SyncField, string> = {
  name: "Name",
  nickname: "Nickname",
  title: "Job title",
  company: "Company",
  emails: "Emails",
  phones: "Phones",
  links: "Links",
  addresses: "Addresses",
  importantDates: "Important dates",
};

export const SYNC_CONFLICT_KIND_LABELS: Record<SyncConflict["kind"], string> = {
  both_edited: "changed in both places",
  edited_vs_removed: "changed in one place, removed in the other",
};
