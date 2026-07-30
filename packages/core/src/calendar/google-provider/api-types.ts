/**
 * The Google JSON shapes this provider reads, declared explicitly rather than
 * cast through `any`. Each one is kept to the fields the corresponding request
 * actually asks for (see the `fields` params in ./api and ./write), so what we
 * hold in memory matches what we asked Google to send.
 */

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

export interface GoogleFreeBusyResponse {
  calendars?: { primary?: { busy?: Array<{ start: string; end: string }> } };
}

/** An event endpoint: `date` for all-day (YYYY-MM-DD), `dateTime` for timed. */
export interface GoogleEventDateTime {
  date?: string;
  dateTime?: string;
}

/** Rooms and equipment come back as attendees carrying `resource: true`. */
export interface GoogleEventAttendee {
  email?: string;
  displayName?: string;
  resource?: boolean;
}

/** Google omits `summary` entirely on untitled events, hence the optionals. */
export interface GoogleEventItem {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: GoogleEventAttendee[];
}

export interface GoogleEventsResponse {
  items?: GoogleEventItem[];
}

export interface GoogleCalendarListResponse {
  items?: Array<{ id: string; summary?: string }>;
}

/** calendars.insert / events.insert / events.patch all answer with the id. */
export interface GoogleIdResponse {
  id: string;
}

/** The body we send to events.insert / events.patch. */
export interface GoogleEventBody {
  summary: string;
  description?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
}
