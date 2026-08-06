import type { ExtractedContact } from "@dhaga/core";
import type {
  DownloadedMedia,
  MessagingClient,
  MessagingProvider,
  NormalizedInboundMessage,
  OutboundMessage,
} from "@dhaga/core/src/messaging";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import type { ConfirmationOption } from "@dhaga/core";

/**
 * Shared fixture for the inbound-messaging case matrix. A FAKE provider (a real
 * MessagingClient implementation, registered through the gateway registry) plus
 * an in-memory stand-in for the tenant DB, so every case can be driven through
 * the same parse → handle → batch path production uses, and asserted on by what
 * the bot REPLIED and what landed in the graph.
 *
 * The module doubles that write into this store live in ./mocks, which each
 * case file wires up with one async vi.mock factory per module.
 */

export interface StoredNote {
  id: string;
  contactId: string;
  kind: string;
  body: string;
}

export interface StoredConfirmation {
  noteBody: string;
  subjectName: string | null;
  question: string;
  options: ConfirmationOption[];
}

export interface FakeStore {
  /** Every text the bot sent back, in order. */
  sent: string[];
  /** Items appended to the open batch. */
  items: MessagingSessionItemRow[];
  contacts: Map<string, string>;
  notes: StoredNote[];
  /** note_subject confirmations raised for the user to resolve in the app. */
  confirmations: StoredConfirmation[];
  extractionCalls: Array<{ contactId: string; body: string }>;
  /** Callbacks handed to next/server's after(); tests run them explicitly. */
  deferred: Array<() => unknown>;
  userId: string | null;
  linkToken: string | null;
  candidates: Array<{ id: string; name: string; title: string | null }>;
  /** `isInstruction` is optional: only the cases ABOUT instructions set it, and
   *  the default — "this is content" — is the safe reading everywhere else. */
  extraction: { contact: ExtractedContact; isNoteAboutPerson: boolean; subjectName: string; noteBody: string; isInstruction?: boolean };
  /** Per-call extraction results, consumed in order. A batch that spans several
   *  people needs a different parse per note; when empty, `extraction` stands. */
  extractionQueue: FakeStore["extraction"][];
  contactParseCalls: number;
  scan: { contact?: ExtractedContact; rawText?: string; error?: string };
  photoText: string | null;
  media: DownloadedMedia | null;
  /** Photos kept as visual receipts, with the note each hangs off. */
  cardImages: Array<{ contactId: string; noteId: string | null; count: number }>;
  /** The per-user "keep captured photos" privacy switch. */
  storePhotos: boolean;
}

export const store: FakeStore = emptyStore();

function emptyStore(): FakeStore {
  return {
    sent: [],
    items: [],
    contacts: new Map(),
    notes: [],
    confirmations: [],
    extractionCalls: [],
    deferred: [],
    userId: "user-1",
    linkToken: null,
    candidates: [],
    extraction: { contact: contact("Nobody"), isNoteAboutPerson: false, subjectName: "", noteBody: "", isInstruction: false },
    extractionQueue: [],
    contactParseCalls: 0,
    scan: {},
    photoText: null,
    media: null,
    cardImages: [],
    storePhotos: true,
  };
}

export function contact(name: string): ExtractedContact {
  return {
    name,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
    tags: [],
    notes: null,
  } as unknown as ExtractedContact;
}

export function resetStore(): void {
  Object.assign(store, emptyStore());
}

/** Names of every contact created during a case, for readable assertions. */
export function contactNames(): string[] {
  return [...store.contacts.values()];
}

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

