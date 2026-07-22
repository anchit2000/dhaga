import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { handleAttachCapture, handleImageCapture, handleTextCapture } from "./handlers";
import { parseCaptureRequest } from "./parse-request";

/**
 * One-shot capture for external surfaces (browser extension; later, mobile
 * share sheets): raw text in → extracted contact saved with the source text
 * as its receipt note. Same pipeline as web quick-add, minus the review
 * step — the extension shows the result and links to the contact for edits.
 * Branch handlers live in ./handlers.ts; this stays a thin dispatcher.
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  try {
    await enforceRateLimit(userId, "capture");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: "Too many captures — slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } },
      );
    }
    throw error;
  }

  let parsed;
  try {
    parsed = await parseCaptureRequest(request);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (parsed.imageBase64) return handleImageCapture(userId, parsed);

  if (!parsed.raw) {
    return Response.json({ error: "Nothing to capture." }, { status: 400 });
  }
  if (parsed.raw.length > 10_000) {
    return Response.json({ error: "Selection too long." }, { status: 400 });
  }

  if (parsed.contactId) return handleAttachCapture(userId, parsed);

  return handleTextCapture(userId, parsed);
}
