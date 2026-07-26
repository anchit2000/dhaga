import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { streamSearchAnswer } from "@/lib/ai/search";

/** Server-side pipeline (LLM gateway, request-scoped DB) — never the Edge runtime. */
export const runtime = "nodejs";
/** A reasoned Ask-Dhaga answer streams its steps, then the answer token-by-token,
 *  then receipts; 60s covers a Sonnet answer over the retrieved candidates. */
export const maxDuration = 60;

/**
 * Streaming "Ask Dhaga": pumps `streamSearchAnswer` as newline-delimited JSON
 * (one event per line) so the palette can render reasoning steps, the answer as
 * it arrives, and receipts. The generator owns metering + the failure
 * discrimination; this route only authenticates, validates, and pipes.
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  let query = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "q" in body) {
      query = String((body as { q: unknown }).q ?? "").trim();
    }
  } catch {
    // Malformed JSON → treat as an empty question below.
  }
  if (!query) {
    return Response.json({ error: "Type a question first." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    // Runs synchronously during construction inside this handler, so the request
    // context stays live for the whole pump. The generator opens its own
    // short-lived DB scopes (withUserDb) and never pins a connection across the
    // answer stream, so no request-scoped connection is held here.
    async start(controller) {
      try {
        for await (const event of streamSearchAnswer(userId, query)) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } catch (error) {
        // Anything the generator didn't already turn into a notice still ends
        // the stream with a clean line so the client's reader loop terminates.
        // Log PII-free so an unexpected stream abort isn't silently swallowed.
        console.error("[ask-dhaga] stream aborted", {
          name: error instanceof Error ? error.name : typeof error,
          code: (error as { code?: unknown } | null)?.code,
        });
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "notice",
              message: "The AI had trouble answering. Please retry.",
              kind: "error",
            })}\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-store",
    },
  });
}
