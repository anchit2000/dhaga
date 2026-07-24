import type { CaptureRequest, CaptureResponse } from "@dhaga/core/src/api/capture";
import type { EventRenameRequest, EventRenameResponse } from "@dhaga/core/src/api/events";
import type { ImportRequest, ImportResponse } from "@dhaga/core/src/api/import";
import type { MobileSettings } from "@/types";

/** A capture failure with a message safe to show the user. */
export class CaptureError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "CaptureError";
    this.status = status;
  }
}

/**
 * POST /api/capture with the user's own API key. Throws CaptureError with a
 * friendly message on any failure; never logs the captured content.
 */
export async function captureContact(
  settings: MobileSettings,
  request: CaptureRequest,
): Promise<CaptureResponse> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `Capture failed (HTTP ${response.status}). Try again.`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  return (await response.json()) as CaptureResponse;
}

/**
 * POST /api/import with the user's own API key — bulk-creates the contacts the
 * user selected from their device address book. Mirrors captureContact's
 * transport/error handling; never logs the imported contact data.
 */
export async function importContacts(
  settings: MobileSettings,
  request: ImportRequest,
): Promise<ImportResponse> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}/api/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `Import failed (HTTP ${response.status}). Try again.`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  return (await response.json()) as ImportResponse;
}

/**
 * PATCH /api/events/[id] with the user's own API key — the one-time
 * "Name this event?" prompt after M2 auto event grouping creates a event.
 */
export async function renameEvent(
  settings: MobileSettings,
  eventId: string,
  name: string,
): Promise<EventRenameResponse> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}/api/events/${eventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({ name } satisfies EventRenameRequest),
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `Couldn't rename the event (HTTP ${response.status}).`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  return (await response.json()) as EventRenameResponse;
}

/** Shared by captureContact and renameEvent: both APIs return `{ error }` on failure. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) {
    return "API key rejected — create one in Dhaga web Settings and enter it on the setup screen.";
  }
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // fall through to the generic message
  }
  return fallback;
}
