import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { UNNAMED_CONTACT_NAME, createdPersonLine } from "@/utils/constants/messaging";
import { contactNames, outcomeFor, resetStore, store } from "./harness";
import { fakeProvider } from "./provider";
import { person, plan } from "./plans";

vi.mock("@/lib/db/request-scope", async () => (await import("./mocks")).requestScopeMock());
vi.mock("next/server", async () => (await import("./mocks")).afterMock());
vi.mock("@/lib/repo/messaging", async () => (await import("./mocks")).repoMessagingMock());
vi.mock("@/lib/repo/confirmations", async () => (await import("./mocks")).confirmationsMock());
vi.mock("@/lib/repo/contacts", async () => (await import("./mocks")).contactsMock());
vi.mock("@/lib/repo/notes", async () => (await import("./mocks")).notesMock());
vi.mock("@/lib/repo/embeddings", async () => (await import("./mocks")).embeddingsMock());
vi.mock("@/lib/repo/card-images", async () => (await import("./mocks")).cardImagesMock());
vi.mock("@/lib/repo/settings", async () => (await import("./mocks")).settingsMock());
vi.mock("@/lib/repo/edge-suggestions", async () => (await import("./mocks")).aiMock().edges);
vi.mock("@/lib/ai/note-extraction", async () => (await import("./mocks")).noteExtractionMock());
vi.mock("@/lib/ai/batch-plan", async () => (await import("./mocks")).batchPlanMock());
vi.mock("@/lib/ai/card-scan", async () => (await import("./mocks")).aiMock().cardScan);
vi.mock("@/lib/ai/photo-note", async () => (await import("./mocks")).aiMock().photoNote);
vi.mock("@/lib/ai/metering", async () => (await import("./mocks")).aiMock().metering);
vi.mock("@/app/api/telegram/route", async () => (await import("./mocks")).aiMock().owner);

const { processMessagingSession } = await import("@/lib/messaging");
const { itemRow } = await import("./mocks");

/**
 * WHO A NOTE BELONGS TO — the decision a 24h capture window makes constantly and
 * the one nobody but the sender can check.
 *
 * This file exists because of a REPORTED BUG. The old walk read each message on
 * its own with a "current contact" cursor carried between them; a first message
 * that raised an ambiguity left the cursor unset, and the next message ("Create
 * a new contact") arrived unable to know the first existed. It created a contact
 * literally named "Unnamed contact" while the user's real note sat stranded in a
 * confirmation the UI could not display.
 *
 * The rules encoded here: the batch is planned as a WHOLE, so a later message is
 * read beside the one it refers to; a full name that merely shares a first name
 * with existing contacts is a NEW person, not an ambiguity; and an id the
 * planner was never shown is refused outright, because filing a stranger's notes
 * onto a real contact is the worst outcome this flow has.
 */
const BIO =
  "https://linkedin.com/in/priyaraman — Priya Raman is the founder of Lumen Labs. Introduced to me by Neha Kulkarni.";

/** First-name collisions, all unrelated to Priya Raman. */
const OTHER_PRIYAS = [
  { id: "c1", name: "Priya Nair", title: "Northwind Retail" },
  { id: "c2", name: "Priya Ma'am", title: null },
  { id: "c3", name: "Priya Venkat Ma'am", title: null },
];

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
  store.candidates = OTHER_PRIYAS;
});

describe("a bio followed by 'Create a new contact'", () => {
  it("becomes ONE contact named Priya Raman, never an 'Unnamed contact'", async () => {
    store.items.push(itemRow("text", { text: BIO }));
    store.items.push(itemRow("text", { text: "Create a new contact" }));
    store.plan = plan({
      people: [person({ name: "Priya Raman", seqs: [1, 2], notes: [{ body: BIO, seqs: [1] }] })],
    });

    const summary = await runBatch();

    // WHY: this is the reported failure, verbatim. The directive is only
    // meaningful beside the message before it, so the fix is that ONE call sees
    // both — assert that first, because everything below follows from it.
    expect(store.planCalls).toHaveLength(1);
    expect(store.planCalls[0].items.map((item) => item.seq)).toEqual([1, 2]);

    expect(contactNames()).toEqual(["Priya Raman"]);
    expect(contactNames()).not.toContain(UNNAMED_CONTACT_NAME);
    expect(store.notes.map((note) => note.body)).toEqual([BIO]);
    // The directive is ACCOUNTED FOR, not stored and not dropped: it told us
    // what to do with message 1 and carried nothing of its own.
    expect(outcomeFor(2)?.kind).toBe("directive");
    expect(summary).toBe(createdPersonLine("Priya Raman", 1));
  });
});

describe("a full name that shares a first name with known contacts", () => {
  it("creates a new person, with no confirmation and no note on the wrong Priya", async () => {
    store.items.push(itemRow("text", { text: BIO }));
    store.plan = plan({
      people: [person({ name: "Priya Raman", seqs: [1], notes: [{ body: BIO, seqs: [1] }] })],
    });

    await runBatch();

    // WHY: "Priya Raman" resembling three unrelated Priyas is a resemblance, not
    // an ambiguity. Treating it as one is what parked the user's note where they
    // could not reach it — so the pool is offered to the planner and the
    // planner's answer, not the LIKE match, decides.
    expect(store.candidateQuery).toContain("Priya Raman");
    expect(store.planCalls[0].candidates.map((candidate) => candidate.name)).toEqual([
      "Priya Nair",
      "Priya Ma'am",
      "Priya Venkat Ma'am",
    ]);
    expect(store.confirmations).toEqual([]);
    expect(contactNames()).toEqual(["Priya Raman"]);
    const wrongPriyas = OTHER_PRIYAS.map((candidate) => candidate.id);
    expect(store.notes.map((note) => note.contactId)).not.toEqual(
      expect.arrayContaining(wrongPriyas),
    );
  });
});

describe("a plan naming a contact id nobody offered", () => {
  it("creates the person instead of writing against a stranger's id", async () => {
    store.items.push(itemRow("text", { text: BIO }));
    store.plan = plan({
      people: [
        person({
          name: "Priya Raman",
          existingContactId: "id-never-shown-to-the-model",
          seqs: [1],
          notes: [{ body: BIO, seqs: [1] }],
        }),
      ],
    });

    const summary = await runBatch();

    // WHY: the model never sees a database id it was not handed, so a returned
    // id outside the candidate pool is a hallucination. Honouring one would file
    // this batch's notes onto an unrelated real person — silent corruption the
    // sender cannot see. Creating a duplicate is the recoverable failure.
    expect(contactNames()).toEqual(["Priya Raman"]);
    expect(store.notes[0].contactId).not.toBe("id-never-shown-to-the-model");
    expect([...store.contacts.keys()]).toContain(store.notes[0].contactId);
    expect(summary).toBe(createdPersonLine("Priya Raman", 1));
  });
});
