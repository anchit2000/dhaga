import type { ContactMethod, ContactProfile, Position } from "@dhaga/core";
import type { ObservedContact, SyncPushRequest } from "@dhaga/core/src/api/sync";

/**
 * Builders for the contact-sync tests. Each test file boots its own in-memory
 * PGlite, so names only need to be distinct within a file.
 */
export const USER = "sync-test-user";

export const method = (value: string): ContactMethod => ({ value, label: null, note: null });

export function role(title: string | null, company: string | null): Position {
  return {
    title,
    company,
    department: null,
    current: true,
    startedAt: null,
    endedAt: null,
    note: null,
    relation: null,
  };
}

export function profile(over: Partial<ContactProfile> & { name: string }): ContactProfile {
  return {
    nickname: null,
    positions: [],
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
    customFields: [],
    location: null,
    ...over,
  };
}

export function observed(
  over: Partial<ObservedContact> & { externalId: string; name: string },
): ObservedContact {
  return {
    nickname: null,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
    etag: null,
    ...over,
  };
}

export function push(
  over: Partial<SyncPushRequest> & { containerId: string },
): SyncPushRequest {
  return { provider: "device", contacts: [], full: false, ...over };
}
