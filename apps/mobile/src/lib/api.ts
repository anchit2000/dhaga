import type {
  CaptureErrorResponse,
  CaptureRequest,
  CaptureResponse,
} from "@dhaga/core/src/api/capture";
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
    throw new CaptureError(await errorMessage(response), response.status);
  }
  return (await response.json()) as CaptureResponse;
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return "API key rejected — create one in Dhaga web Settings and enter it on the setup screen.";
  }
  try {
    const body = (await response.json()) as CaptureErrorResponse;
    if (body.error) return body.error;
  } catch {
    // fall through to the generic message
  }
  return `Capture failed (HTTP ${response.status}). Try again.`;
}
