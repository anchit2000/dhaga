/**
 * The slice of Microsoft Graph's contact resource this provider touches.
 *
 * Graph models a contact far more rigidly than People or vCard: phones are three
 * separate typed arrays, there is exactly ONE url slot (`businessHomePage`) and
 * exactly one date (`birthday`). What that costs is handled in ./map.ts.
 */

export interface GraphEmailAddress {
  name?: string;
  address?: string;
}

export interface GraphPhysicalAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryOrRegion?: string;
}

/**
 * Present ONLY on a delta page: Graph reports a contact removed since the
 * deltaLink was issued as a bare id carrying this, with no properties at all.
 * See ./target/list.ts for why such a record must never become an
 * ExternalContact.
 */
export interface GraphRemoved {
  reason?: string;
}

export interface GraphContact {
  id?: string;
  "@odata.etag"?: string;
  "@removed"?: GraphRemoved;
  displayName?: string;
  givenName?: string;
  surname?: string;
  nickName?: string;
  companyName?: string;
  jobTitle?: string;
  emailAddresses?: GraphEmailAddress[];
  /** Graph splits phones by kind rather than labelling them. */
  homePhones?: string[];
  businessPhones?: string[];
  mobilePhone?: string;
  homeAddress?: GraphPhysicalAddress;
  businessAddress?: GraphPhysicalAddress;
  otherAddress?: GraphPhysicalAddress;
  businessHomePage?: string;
  birthday?: string;
}

export interface GraphContactsResponse {
  value?: GraphContact[];
  "@odata.nextLink"?: string;
  /** Delta only, and only on the FINAL page: the opaque cursor for the next run. */
  "@odata.deltaLink"?: string;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export interface MicrosoftIdTokenPayload {
  preferred_username?: string;
  email?: string;
}
