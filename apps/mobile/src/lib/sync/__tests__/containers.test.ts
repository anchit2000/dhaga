import { describe, expect, it } from "vitest";

import {
  containerNotice,
  containerSyncsRemotely,
  contactsInContainer,
  pickWriteContainer,
} from "../containers";
import {
  ANDROID_ACCOUNT_NOTICE,
  LOCAL_CONTAINER_NOTICE,
  UNKNOWN_CONTAINER_NOTICE,
} from "@/utils/constants/sync";

import type { ExternalContact, SyncContainer } from "@dhaga/core/src/sync/types";

function container(id: string, type: string, name = id): SyncContainer {
  return { id, name, type, syncsRemotely: containerSyncsRemotely(type) };
}

const ICLOUD = container("c-icloud", "cardDAV", "iCloud");
const EXCHANGE = container("c-exchange", "exchange", "Work");
const ON_MY_PHONE = container("c-local", "local", "On My iPhone");

describe("containerSyncsRemotely", () => {
  it("treats cardDAV and exchange as remote, everything else as device-only", () => {
    // The whole feature rests on this: a write into a cardDAV container reaches
    // iCloud/Google with no OAuth, a write into a local one reaches nothing.
    expect(containerSyncsRemotely("cardDAV")).toBe(true);
    expect(containerSyncsRemotely("exchange")).toBe(true);
    expect(containerSyncsRemotely("local")).toBe(false);
    expect(containerSyncsRemotely("unassigned")).toBe(false);
    expect(containerSyncsRemotely("unknown")).toBe(false);
  });
});

describe("pickWriteContainer", () => {
  it("prefers a syncing container over a local default", () => {
    // Containers arrive default-first. A local default must not win, or every
    // contact Dhaga creates dies on the handset.
    expect(pickWriteContainer([ON_MY_PHONE, ICLOUD])).toBe(ICLOUD);
  });

  it("keeps the default when the default already syncs", () => {
    expect(pickWriteContainer([ICLOUD, EXCHANGE])).toBe(ICLOUD);
  });

  it("falls back to the default rather than refusing to sync", () => {
    // A device-only address book is still worth syncing with Dhaga; the caller
    // pairs this with containerNotice so the user knows writes stop here.
    expect(pickWriteContainer([ON_MY_PHONE])).toBe(ON_MY_PHONE);
  });

  it("returns null when the platform enumerates nothing (Android)", () => {
    expect(pickWriteContainer([])).toBeNull();
  });
});

describe("containerNotice", () => {
  it("always warns on Android, even when a container was somehow found", () => {
    // Android cannot choose the account for a CREATED contact, so no container
    // finding can make the Android caveat untrue.
    expect(containerNotice(ICLOUD, "android")).toBe(ANDROID_ACCOUNT_NOTICE);
  });

  it("stays silent only when writes really will leave the device", () => {
    expect(containerNotice(ICLOUD, "ios")).toBeNull();
    expect(containerNotice(EXCHANGE, "ios")).toBeNull();
  });

  it("warns when the chosen container is local-only", () => {
    expect(containerNotice(ON_MY_PHONE, "ios")).toBe(LOCAL_CONTAINER_NOTICE);
  });

  it("warns when no container could be identified at all", () => {
    expect(containerNotice(null, "ios")).toBe(UNKNOWN_CONTAINER_NOTICE);
  });
});

function observedContact(externalId: string, containerId: string | null): ExternalContact {
  return {
    externalId,
    containerId,
    etag: null,
    name: externalId,
    nickname: null,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
  };
}

describe("contactsInContainer", () => {
  const observed = [
    observedContact("a", "c-icloud"),
    observedContact("b", "c-local"),
    observedContact("c", null),
  ];

  it("scopes the batch to one container", () => {
    // The push is sent with full: true, which the server may read as "anything
    // absent was deleted". Leaking another container's contacts into the batch
    // would make deletions in one look like deletions in the other.
    expect(contactsInContainer(observed, "c-icloud").map((c) => c.externalId)).toEqual(["a"]);
  });

  it("matches the container-less case (Android, where nothing is enumerable)", () => {
    expect(contactsInContainer(observed, null).map((c) => c.externalId)).toEqual(["c"]);
  });
});
