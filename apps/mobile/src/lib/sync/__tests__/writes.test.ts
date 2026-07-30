import { describe, expect, it } from "vitest";

import { createPayload, isCreate, toObserved } from "../writes";

import type { SyncWrite } from "@dhaga/core/src/api/sync";
import type { ExternalContact } from "@dhaga/core/src/sync/types";

describe("createPayload", () => {
  it("fills the fields a brand new record simply doesn't have yet", () => {
    expect(createPayload({ name: "Ada Lovelace", title: "Mathematician" })).toEqual({
      name: "Ada Lovelace",
      nickname: null,
      title: "Mathematician",
      company: null,
      emails: [],
      phones: [],
      links: [],
      addresses: [],
      importantDates: [],
    });
  });

  it("refuses to create a nameless address-book entry", () => {
    // Empty-filling is only ever valid for a create. A nameless card would be
    // unfindable, so the engine reports the write as failed instead.
    expect(createPayload({ emails: [] })).toBeNull();
    expect(createPayload({ name: "  " })).toBeNull();
  });
});

describe("toObserved", () => {
  it("drops containerId but keeps the identity the server links on", () => {
    // The push carries one containerId for the whole batch; a per-contact copy
    // would be a second source of truth for the same fact.
    const contact: ExternalContact = {
      externalId: "device-1",
      containerId: "c-icloud",
      etag: null,
      name: "Ada Lovelace",
      nickname: null,
      title: null,
      company: null,
      emails: [],
      phones: [],
      links: [],
      addresses: [],
      importantDates: [],
    };
    const [observed] = toObserved([contact]);
    expect(observed).not.toHaveProperty("containerId");
    expect(observed.externalId).toBe("device-1");
    expect(observed.etag).toBeNull();
  });
});

describe("isCreate", () => {
  it("reads a null externalId as a create, because the id doesn't exist yet", () => {
    const create: SyncWrite = { externalId: null, contactId: "k1", fields: {}, etag: null };
    const update: SyncWrite = { externalId: "device-1", contactId: "k1", fields: {}, etag: null };
    expect(isCreate(create)).toBe(true);
    expect(isCreate(update)).toBe(false);
  });
});
