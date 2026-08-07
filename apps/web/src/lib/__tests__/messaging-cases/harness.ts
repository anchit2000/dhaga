import type {
  BatchPlan,
  BatchPlanCandidate,
  BatchPlanItem,
  ConfirmationOption,
  ContactProfile,
  ExtractedContact,
} from "@dhaga/core";
import type { DownloadedMedia } from "@dhaga/core/src/messaging";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import type { MessagingItemOutcome } from "@/utils/constants/messaging";

/**
 * Shared fixture for the inbound-messaging case matrix. A FAKE provider (a real
 * MessagingClient implementation, registered through the gateway registry, in
 * ./provider) plus an in-memory stand-in for the tenant DB, so every case runs
 * the same parse → handle → DONE → derive → plan → apply path production uses
 * and is asserted on by what the bot REPLIED, what landed in the graph, and what
 * verdict each forwarded message ended up with.
 *
 * The seam that matters is the PLANNER. There is no per-message extraction call
 * any more: a closed batch is derived to text, planned in ONE call that sees
 * every message together, then applied deterministically. So a case sets `plan`
 * (what the model decided) and asserts on `planCalls` (what the model was SHOWN
 * — the derived items and the candidate pool). A wrong graph now traces back to
 * exactly one of those two, which is the whole reason the walk was replaced.
 *
 * The module doubles that write into this store live in ./mocks, which each case
 * file wires up with one async vi.mock factory per module.
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
  /** "messaging" is what makes a background batch's question VISIBLE in the inbox. */
  origin: string | null;
}

/** One persisted per-message verdict, keyed back to the seq the plan spoke in. */
export interface RecordedOutcome {
  seqs: number[];
  kind: MessagingItemOutcome;
  detail: Record<string, unknown> | null;
}

/** What the batch planner was handed — the derived batch and the candidate pool. */
export interface PlanCall {
  items: BatchPlanItem[];
  candidates: BatchPlanCandidate[];
}

export interface FakeStore {
  /** Every text the bot sent back, in order. */
  sent: string[];
  /** Items appended to the open batch. */
  items: MessagingSessionItemRow[];
  contacts: Map<string, string>;
  /** Structured profiles written through createContactProfile (the vCard path). */
  profiles: ContactProfile[];
  notes: StoredNote[];
  /** note_subject confirmations raised for the user to resolve in the app. */
  confirmations: StoredConfirmation[];
  extractionCalls: Array<{ contactId: string; body: string }>;
  /** The audit trail the capture-log UI reads back. */
  outcomes: RecordedOutcome[];
  statuses: string[];
  sessionOutcome: { summary: string | null; error: string | null } | null;
  /** Callbacks handed to next/server's after(); tests run them explicitly. */
  deferred: Array<() => unknown>;
  userId: string | null;
  linkToken: string | null;
  /** Existing contacts the candidate query returns. */
  candidates: BatchPlanCandidate[];
  /** The names guessNames() produced, as handed to findBatchCandidates. */
  candidateQuery: string[];
  planCalls: PlanCall[];
  /** What the one planning call returns. Empty by default: a plan that mentions
   *  nothing must leave every message `unaccounted`, never silently dropped. */
  plan: BatchPlan;
  /** PII-free failure code the planner throws instead of returning a plan. */
  planError: string | null;
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
    profiles: [],
    notes: [],
    confirmations: [],
    extractionCalls: [],
    outcomes: [],
    statuses: [],
    sessionOutcome: null,
    deferred: [],
    userId: "user-1",
    linkToken: null,
    candidates: [],
    candidateQuery: [],
    planCalls: [],
    plan: { people: [], unclear: [] },
    planError: null,
    scan: {},
    photoText: null,
    media: null,
    cardImages: [],
    storePhotos: true,
  };
}

export function contact(name: string): ExtractedContact {
  return { name, title: null, company: null, emails: [], phones: [], links: [], location: null };
}

export function resetStore(): void {
  Object.assign(store, emptyStore());
}

/** Names of every contact created during a case, for readable assertions. */
export function contactNames(): string[] {
  return [...store.contacts.values()];
}

/** The verdict a given message ended up with — the capture log's per-item row. */
export function outcomeFor(seq: number): RecordedOutcome | undefined {
  return store.outcomes.find((outcome) => outcome.seqs.includes(seq));
}
