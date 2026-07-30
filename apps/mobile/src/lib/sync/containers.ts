import {
  ANDROID_ACCOUNT_NOTICE,
  LOCAL_CONTAINER_NOTICE,
  REMOTE_CONTAINER_TYPES,
  UNKNOWN_CONTAINER_NOTICE,
} from "@/utils/constants/sync";

import type { ExternalContact, SyncContainer } from "@dhaga/core/src/sync/types";

/**
 * Container choice, kept pure so it is unit-testable without a device. Which
 * container Dhaga writes into decides whether an edit reaches iCloud/Google or
 * dies on the handset, so this is the one piece of the sync client that must
 * not be guessed at.
 */

/** `Platform.OS`, narrowed to the cases this logic distinguishes. */
export type SyncPlatform = "ios" | "android" | "other";

/**
 * Whether writes into a container propagate to a remote account. Derived from
 * the platform's own container type ('cardDAV' | 'exchange' | 'local' | …),
 * never from the container's display name — "iCloud" is a name a user can put
 * on a local container.
 */
export function containerSyncsRemotely(type: string): boolean {
  return REMOTE_CONTAINER_TYPES.includes(type);
}

/**
 * The container new contacts are created in: the first remotely-syncing one,
 * else the platform default. Callers list containers default-first, so a
 * syncing default always wins over a syncing secondary account.
 *
 * Falling back to a local container rather than refusing is deliberate: a
 * device-only address book is still worth syncing with Dhaga, and the caller
 * pairs the fallback with {@link containerNotice} so the user is told the
 * writes stop here. `null` means "let the platform decide" — all Android can do.
 */
export function pickWriteContainer(containers: readonly SyncContainer[]): SyncContainer | null {
  return containers.find((container) => container.syncsRemotely) ?? containers[0] ?? null;
}

/**
 * The honest one-line caveat for this platform + container, or null when writes
 * really will reach a remote account. Never suppressed: a silent local-only
 * sync looks identical to a working one until the user checks another device.
 */
export function containerNotice(
  target: SyncContainer | null,
  platform: SyncPlatform,
): string | null {
  if (platform === "android") return ANDROID_ACCOUNT_NOTICE;
  if (!target) return UNKNOWN_CONTAINER_NOTICE;
  if (!target.syncsRemotely) return LOCAL_CONTAINER_NOTICE;
  return null;
}

/**
 * The observed contacts that belong to `containerId`. The push contract lets
 * the server read a `full: true` batch as "everything absent from this list was
 * deleted", so the batch must be scoped to exactly one container — mixing
 * containers would make deletions in one look like deletions in another.
 */
export function contactsInContainer(
  contacts: readonly ExternalContact[],
  containerId: string | null,
): ExternalContact[] {
  return contacts.filter((contact) => contact.containerId === containerId);
}
