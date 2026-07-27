import { getMessagingClient, hasMessagingProvider } from "@dhaga/core/src/messaging";
import { logActionError } from "@/lib/actions/resilience";
import { handleInboundMessage } from "@/lib/messaging";

/** Provider SDKs are server-only Node code; a webhook can also run long when a
 *  batch is flushed inline, so give it the same 60s ceiling as other workers. */
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Inbound-messaging webhook, one route for every channel (the [provider]
 * segment selects the client). GET is the platforms' verification handshake
 * (Meta/WhatsApp echo hub.challenge; Telegram has none). POST authenticates the
 * raw body, parses it into normalised messages, and processes each. It NEVER
 * logs the raw body (third-party PII) and ALWAYS answers 200 on POST so a
 * provider can't retry-storm us on a downstream error.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await params;
  if (!hasMessagingProvider(provider)) return new Response("Not found", { status: 404 });
  const client = getMessagingClient(provider);
  const challenge = client.verifyWebhookChallenge?.(new URL(request.url).searchParams);
  if (challenge != null) return new Response(challenge, { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider } = await params;
  if (!hasMessagingProvider(provider)) return new Response("Not found", { status: 404 });
  const client = getMessagingClient(provider);
  // Raw text, not request.json(): signature verification needs the exact bytes.
  const rawBody = await request.text();
  if (!(await client.verifyInbound({ headers: request.headers, rawBody }))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const messages = client.parseInbound(rawBody);
  // Sequential: one sender's forwarded items must land in arrival order, and a
  // single message failing must not abort the rest of the delivery.
  for (const message of messages) {
    try {
      await handleInboundMessage(client, message);
    } catch (error) {
      logActionError("messaging_webhook", error);
    }
  }
  return new Response("ok", { status: 200 });
}
