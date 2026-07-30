import { Platform } from "react-native";
import { Contact, ContactField, Container } from "expo-contacts";
import { addContactAsync } from "expo-contacts/legacy";
import { registerContactSyncTarget } from "@dhaga/core/src/sync";

import { containerSyncsRemotely } from "./containers";
import { detailsToSyncable, syncableToLegacyContact, syncableToPatch } from "./fields";
import { DEVICE_SYNC_PROVIDER } from "@/utils/constants/sync";

import type {
  ContactSyncTarget,
  ExternalContact,
  ExternalRef,
  SyncableContact,
  SyncContainer,
} from "@dhaga/core/src/sync/types";
import type { SyncPlatform } from "./containers";
import type { SyncDetails } from "./fields";

/**
 * The on-device address book as a ContactSyncTarget.
 *
 * Reads and partial writes use the modern class API (`Contact.getAllDetails`,
 * `contact.patch`) — `patch` is the only call in expo-contacts that writes just
 * the supplied fields, which is exactly what the ContactSyncTarget contract
 * demands.
 *
 * CREATES are the one exception, and they go through the LEGACY
 * `addContactAsync(contact, containerId)`. The modern `Contact.create()` takes
 * no container: its iOS implementation calls
 * `saveRequest.add(contact, toContainerWithIdentifier: nil)`, which always
 * lands in the store's default container. Using it would mean a Dhaga-created
 * contact could silently land in "On My iPhone" and reach no other device —
 * the failure this feature exists to prevent. The legacy call is the only way
 * to name the container, so it is used for creates and nothing else.
 *
 * Neither API exposes an etag or a modified-since query, so `etag` is always
 * null and `listChanged` always returns the whole address book (see below).
 */

/** The detail fields sync reads. Anything not listed stays on the device. */
const SYNC_DETAIL_FIELDS = [
  ContactField.FULL_NAME,
  ContactField.GIVEN_NAME,
  ContactField.FAMILY_NAME,
  ContactField.NICKNAME,
  ContactField.EXTRA_NAMES,
  ContactField.COMPANY,
  ContactField.JOB_TITLE,
  ContactField.EMAILS,
  ContactField.PHONES,
  ContactField.URL_ADDRESSES,
  ContactField.ADDRESSES,
  ContactField.BIRTHDAY,
  ContactField.DATES,
] as const;

export function syncPlatform(): SyncPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "other";
}

/**
 * Containers, default first so pickWriteContainer prefers it. iOS only: on
 * Android the Container class is a fallback whose every method throws
 * "Not implemented", because the platform exposes no account concept through
 * this API. Returning [] there is the honest answer — callers pair it with
 * containerNotice() to tell the user what that costs them.
 */
async function listContainers(): Promise<SyncContainer[]> {
  if (syncPlatform() !== "ios") return [];
  const [fallbackDefault, all] = await Promise.all([Container.getDefault(), Container.getAll()]);
  const ordered = fallbackDefault
    ? [fallbackDefault, ...all.filter((container) => container.id !== fallbackDefault.id)]
    : all;
  return Promise.all(
    ordered.map(async (container): Promise<SyncContainer> => {
      const [name, type] = await Promise.all([container.getName(), container.getType()]);
      return {
        id: container.id,
        name: name ?? container.id,
        type: type ?? "unknown",
        syncsRemotely: containerSyncsRemotely(type ?? "unknown"),
      };
    }),
  );
}

/** contactId → containerId, for the iOS containers we can enumerate. */
async function containerMembership(): Promise<Map<string, string>> {
  if (syncPlatform() !== "ios") return new Map();
  const containers = await Container.getAll();
  const membership = new Map<string, string>();
  for (const container of containers) {
    const contacts = await container.getContacts();
    for (const contact of contacts) membership.set(contact.id, container.id);
  }
  return membership;
}

/**
 * The whole address book. `since` is accepted for the interface and ignored:
 * neither expo-contacts API exposes a modified-since query, so there is no
 * honest way to answer a narrower question. Callers must therefore treat every
 * result as a full snapshot — which is what makes `full: true` on the push
 * truthful, and what lets the server detect deletions at all.
 */
async function listChanged(_since: Date | null): Promise<ExternalContact[]> {
  // Annotated, not inferred: this assignment is what proves the local
  // SyncDetails mirror still matches what expo-contacts actually returns.
  const details: SyncDetails[] = await Contact.getAllDetails(SYNC_DETAIL_FIELDS);
  const membership = await containerMembership();
  return details.map((record) => ({
    ...detailsToSyncable(record),
    externalId: record.id,
    containerId: membership.get(record.id) ?? null,
    etag: null,
  }));
}

async function create(contact: SyncableContact, containerId: string | null): Promise<ExternalRef> {
  const record = syncableToLegacyContact(contact);
  if (!record) throw new Error("Cannot create a contact with no name");
  const externalId = await addContactAsync(record, containerId ?? undefined);
  return { externalId, etag: null };
}

async function patch(
  externalId: string,
  fields: Partial<SyncableContact>,
  _etag: string | null,
): Promise<ExternalRef> {
  await new Contact(externalId).patch(syncableToPatch(fields, syncPlatform()));
  return { externalId, etag: null };
}

export const deviceContactSyncTarget: ContactSyncTarget = {
  id: DEVICE_SYNC_PROVIDER,
  listContainers,
  listChanged,
  create,
  patch,
};

registerContactSyncTarget(deviceContactSyncTarget);
