import type {
  DownloadedMedia,
  MessagingClient,
  MessagingProvider,
  NormalizedInboundMessage,
  OutboundMessage,
} from "@dhaga/core/src/messaging";
import { store } from "./harness";

/**
 * The FAKE provider: a real MessagingClient registered through the gateway
 * registry, so the cases drive the same wire → normalise → route path production
 * does rather than calling the handler with a hand-made object. Split out of
 * ./harness (the store) per the 150-line rule; kept out of ./mocks because it is
 * not a module double — it is a legitimate implementation of the contract, which
 * is the point of the gateway pattern.
 */
class FakeMessagingClient implements MessagingClient {
  readonly providerId = "fake";

  verifyInbound(): boolean {
    return true;
  }

  /** Wire format: { from, name?, messages: [{ id, content }] }. */
  parseInbound(rawBody: string): NormalizedInboundMessage[] {
    const body = JSON.parse(rawBody) as {
      from: string;
      name?: string;
      messages: Array<{ id: string; content: NormalizedInboundMessage["content"] }>;
    };
    return body.messages.map((message) => ({
      provider: "fake",
      externalUserId: body.from,
      externalUserName: body.name ?? null,
      messageId: message.id,
      timestamp: null,
      content: message.content,
    }));
  }

  async sendText(message: OutboundMessage): Promise<void> {
    store.sent.push(message.text);
  }

  async downloadMedia(): Promise<DownloadedMedia> {
    if (!store.media) throw new Error("media download failed");
    return store.media;
  }
}

export const fakeClient = new FakeMessagingClient();

export const fakeProvider: MessagingProvider = {
  id: "fake",
  label: "Fake",
  isConfigured: () => true,
  // Same instance every time: the batch processor re-resolves the client, and
  // its replies have to land in the same `sent` log the webhook's did.
  createClient: () => fakeClient,
};
