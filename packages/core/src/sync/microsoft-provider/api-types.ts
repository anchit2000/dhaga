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

export interface GraphContact {
  id?: string;
  "@odata.etag"?: string;
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
