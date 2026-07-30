/**
 * Two-way contact-sync constants. Brand colours live in COLORS
 * ("@/utils/constants") — read them there, never redefined here. This file
 * holds only the fixed values the sync surface needs.
 */
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";

/** Registry id the device address-book target registers itself under. */
export const DEVICE_SYNC_PROVIDER: ContactSyncProviderId = "device";

/**
 * Re-exported, never redefined: this is the size the SERVER accepts in one
 * push, and the phone chunks to it. Two copies of the number is how a client
 * ends up posting batches the server 413s.
 */
export { SYNC_MAX_CONTACTS } from "@dhaga/core/src/api/sync-limits";

/**
 * Container types whose writes LEAVE the phone. `cardDAV` is iCloud and Google;
 * `exchange` is Outlook/Microsoft 365. `local` ("On My iPhone"), `unassigned`
 * and `unknown` stay on the device, so an edit written there reaches no other
 * device and no cloud account — which is the entire point of this feature.
 * Reported verbatim as SyncContainer.syncsRemotely so the user can see, before
 * anything is written, whether their edits will actually travel.
 */
export const REMOTE_CONTAINER_TYPES: readonly string[] = ["cardDAV", "exchange"];

/** Server endpoints. The ack is not optional — see SyncAckRequest in core. */
export const SYNC_PUSH_PATH = "/api/sync/contacts";
export const SYNC_ACK_PATH = "/api/sync/contacts/ack";

/** expo-router segment name + href for the contact-sync screen. */
export const SYNC_SCREEN = "sync" as const;
export const SYNC_HREF = "/sync" as const;

/**
 * The ImportantDate label that maps to the address book's dedicated birthday
 * slot; every other label rides the generic `dates` list. Matches the label
 * @/lib/contacts/map already writes on import, so a contact imported and then
 * synced keeps one birthday rather than gaining a duplicate.
 */
export const BIRTHDAY_LABEL = "Birthday";

/** Label the OS falls back to when a labelled value is written without one. */
export const DEFAULT_DEVICE_LABEL = "other";

/**
 * Android exposes no account/container concept through expo-contacts: the
 * Container class throws "Not implemented" there, and a created raw contact is
 * inserted with no ACCOUNT_TYPE, which the OS stores as device-local. Told
 * plainly rather than hidden — a user who thinks new contacts reach their
 * Google account when they do not has been lied to by the product.
 */
export const ANDROID_ACCOUNT_NOTICE =
  "Android doesn't let apps choose which account a contact belongs to. Changes Dhaga makes to contacts you already have still sync with whatever account owns them, but contacts Dhaga creates stay on this phone.";

/** iOS, containers enumerated, but the one we'd write to is local-only. */
export const LOCAL_CONTAINER_NOTICE =
  "Your contacts are stored only on this iPhone, so Dhaga's changes stay here too. Turn on iCloud Contacts (or add a Google/Exchange account) in iOS Settings to have them reach your other devices.";

/** No container could be enumerated at all — writes go wherever the OS decides. */
export const UNKNOWN_CONTAINER_NOTICE =
  "Dhaga couldn't tell which account holds your contacts, so it can't promise changes will reach your other devices.";

/** What the sync screen shows while each step of a run is in flight. */
export const SYNC_PHASE_LABELS = {
  permission: "Asking for contacts access…",
  reading: "Reading your address book…",
  pushing: "Comparing with Dhaga…",
  writing: "Writing changes to your phone…",
  confirming: "Confirming…",
} as const;

/** How a merge conflict is described to the user. */
export const CONFLICT_KIND_LABELS = {
  both_edited: "changed in both places",
  edited_vs_removed: "changed in one place, removed in the other",
} as const;
