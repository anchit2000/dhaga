/**
 * The slice of Google People API wire shapes this provider touches. Hand-written
 * rather than generated: we read and write nine fields, and a generated client
 * would pull in far more surface than the integration uses.
 *
 * Every field is optional because People omits absent ones entirely rather than
 * returning nulls.
 */

export interface GooglePersonDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface GooglePersonName {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  unstructuredName?: string;
}

export interface GooglePersonValue {
  value?: string;
  /** Google's own enum-ish type ("home", "work", "mobile", "other"). */
  type?: string;
  /** The localized label Google renders; present for custom types. */
  formattedType?: string;
}

export interface GooglePersonOrganization {
  name?: string;
  title?: string;
}

export interface GooglePersonAddress {
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
  formattedType?: string;
}

export interface GooglePersonBirthday {
  date?: GooglePersonDate;
  text?: string;
}

export interface GooglePersonEvent {
  date?: GooglePersonDate;
  type?: string;
  formattedType?: string;
}

export interface GooglePersonMetadata {
  /**
   * Only ever true on an INCREMENTAL page: a syncToken request reports a person
   * removed since the token was minted as a bare resourceName carrying this
   * flag, with no field data at all. See ./target/list.ts for why such a record
   * must never become an ExternalContact.
   */
  deleted?: boolean;
}

export interface GooglePerson {
  /** "people/c12345" — the stable id we persist as `external_id`. */
  resourceName?: string;
  /** Required by updateContact for optimistic concurrency. */
  etag?: string;
  metadata?: GooglePersonMetadata;
  names?: GooglePersonName[];
  nicknames?: GooglePersonValue[];
  organizations?: GooglePersonOrganization[];
  emailAddresses?: GooglePersonValue[];
  phoneNumbers?: GooglePersonValue[];
  urls?: GooglePersonValue[];
  addresses?: GooglePersonAddress[];
  birthdays?: GooglePersonBirthday[];
  events?: GooglePersonEvent[];
}

export interface GoogleConnectionsResponse {
  connections?: GooglePerson[];
  nextPageToken?: string;
  /** Returned when requestSyncToken=true; opaque cursor for the next run. */
  nextSyncToken?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export interface GoogleIdTokenPayload {
  email?: string;
}
