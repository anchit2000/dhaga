import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { createContact, setPersonKind, setStarred } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { PERSON_CLASSIFICATION_BATCH_KEY, getPendingBatchId, setPendingBatchId } from "@/lib/repo/settings";
import { runPersonClassification } from "@/lib/jobs/classify-people";
import type { BatchExtractItem, BatchExtractResult, BatchLLMClient, PersonClassification } from "@dhaga/core";

/**
 * The nightly person-vs-service pass, mirroring signal-detection-batch.test.ts
 * because it is the same two-phase Batch API shape.
 *
 * What these tests actually protect is the ONE failure this design can have that
 * the user would never see coming: a real person quietly labelled a "service"
 * and dropped off every proactive surface. Two mechanisms prevent it and both
 * are asserted here — the due-query never nominates a contact the user has
 * already acted on, and `person_kind_by = 'user'` is a lock re-checked at WRITE
 * time, so a ruling made while a batch was in flight wins over the model.
 */

let submittedItems: BatchExtractItem<unknown>[] | null = null;
let isDone = true;
let pendingResults: BatchExtractResult<PersonClassification>[] = [];

const fakeBatchClient: BatchLLMClient = {
  submitExtractBatch: async (items) => {
    submittedItems = items;
    return "msgbatch_classify_1";
  },
  isBatchDone: async () => isDone,
  getBatchResults: async <T,>() => pendingResults as unknown as BatchExtractResult<T>[],
};

// No real Anthropic client is ever constructed: the whole gateway is stubbed, so
// a network call would fail loudly rather than bill anyone.
vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  return { ...actual, hasBatchLLM: () => true, getBatchLLMClient: () => fakeBatchClient };
});

function person(name: string) {
  return { name, title: null, company: null, emails: [], phones: [], links: [], location: null };
}

/**
 * Push a contact past DECAY_AFTER_DAYS so the going-quiet term can nominate
 * them. The pass judges the NOMINATION POOL, not the graph
 * (lib/jobs/classify-people/pool.ts), and a just-created contact is in neither
 * term — so a fixture that stays at "created today" would test nothing about
 * the exclusions it is here for.
 */
async function backdate(contactId: string): Promise<void> {
  const db = await getDb();
  const old = new Date(Date.now() - 400 * 86_400_000);
  await db.update(contacts).set({ createdAt: old, updatedAt: old }).where(eq(contacts.id, contactId));
}

function serviceVerdict(contactId: string): BatchExtractResult<PersonClassification> {
  return {
    id: contactId,
    status: "succeeded",
    model: "claude-haiku-4-5",
    usage: { inputTokens: 80, outputTokens: 10 },
    data: { kind: "service", confidence: 0.9 },
  };
}

async function readContact(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      personKind: contacts.personKind,
      personKindBy: contacts.personKindBy,
      personKindConfidence: contacts.personKindConfidence,
      classifiedAt: contacts.personClassifiedAt,
    })
    .from(contacts)
    .where(eq(contacts.id, id));
  return row;
}

function submittedIds(): string[] {
  return (submittedItems as BatchExtractItem<unknown>[] | null)?.map((item) => item.id) ?? [];
}

describe("nightly person classification — Batch API two-phase job", () => {
  it("phase 2 nominates only contacts the user has NOT acted on, and stamps them once the batch is in flight", async () => {
    const nominated = await createContact(person("Classify Plain Row"), "import");
    const starred = await createContact(person("Classify Starred Row"), "import");
    await setStarred(starred, true);
    const noted = await createContact(person("Classify Noted Row"), "import");
    await addNote(noted, "text", "Caught up over chai about their new job.");
    // All three are pool-eligible, so the exclusions below are the ONLY reason
    // two of them are left out.
    for (const id of [nominated, starred, noted]) await backdate(id);

    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, null);
    submittedItems = null;
    const summary = await runPersonClassification();

    expect(summary.skipped).toBeNull();
    expect(submittedIds()).toContain(nominated);
    // The exclusions are the safety mechanism, not a nicety: starring someone or
    // writing a note about them is the user demonstrably treating them as a
    // person, so the model gets no vote on them at all.
    expect(submittedIds()).not.toContain(starred);
    expect(submittedIds()).not.toContain(noted);
    // Stamped only after the batch is safely in flight (same ordering as
    // detect-signals) — otherwise a failed submit would mark rows judged with
    // nothing ever classified.
    expect((await readContact(nominated))?.classifiedAt).not.toBeNull();
    expect(await getPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY)).toBe("msgbatch_classify_1");
  });

  it("judges the nomination pool, not the whole address book", async () => {
    // The cost defect: the sweep used to take every un-acted-on contact, 1000 a
    // night, until a 5,000-row address book had been judged (~$2.35). Most of
    // it bought nothing — the label only does anything through
    // surfaceableContact, and a contact nothing has touched can reach a
    // proactive surface only via the going-quiet or degree terms, both of which
    // take a bounded top-N. This row is in neither: freshly created, so not
    // decayed, and no edges.
    const unreachable = await createContact(person("Classify Fresh Import Row"), "import");
    const reachable = await createContact(person("Classify Decayed Row"), "import");
    await backdate(reachable);

    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, null);
    submittedItems = null;
    await runPersonClassification();

    expect(submittedIds()).toContain(reachable);
    expect(submittedIds()).not.toContain(unreachable);
    // And nothing is wrongly hidden while it waits: unjudged is NULL, which
    // surfaceableContact treats as NOT suppressed, so the fresh row is still
    // offered everywhere until the night it actually becomes a candidate.
    expect((await readContact(unreachable))?.personKind).toBeNull();

    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, null);
  });

  it("phase 1 applies a finished batch and clears the pointer, and an errored result writes nothing", async () => {
    const ok = await createContact(person("Classify Verdict Row"), "import");
    const errored = await createContact(person("Classify Errored Row"), "import");
    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, "msgbatch_ready");
    pendingResults = [serviceVerdict(ok), { id: errored, status: "errored" }];
    const summary = await runPersonClassification();

    expect(summary.classified).toBeGreaterThanOrEqual(1);
    const okRow = await readContact(ok);
    expect(okRow?.personKind).toBe("service");
    expect(okRow?.personKindBy).toBe("model");
    expect(okRow?.personKindConfidence).toBeCloseTo(0.9, 5);
    // An errored result is not a verdict: nothing may be written for it.
    expect((await readContact(errored))?.personKind).toBeNull();
    expect(await getPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY)).not.toBe("msgbatch_ready");

    pendingResults = [];
  });

  it("never overwrites a user's ruling, even when the in-flight batch comes back disagreeing with it", async () => {
    const appealed = await createContact(person("Classify Appealed Row"), "import");
    // The user opens the contact and says "no, this is a person" while a batch
    // that already contains this contact is still processing at Anthropic.
    await setPersonKind(appealed, "person");

    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, "msgbatch_stale_verdict");
    pendingResults = [serviceVerdict(appealed)];
    await runPersonClassification();

    // Applying the stale verdict would silently revert the correction — the
    // exact failure person_kind_by exists to prevent, which is why the lock is a
    // clause in the UPDATE's WHERE and not a branch someone can forget.
    const row = await readContact(appealed);
    expect(row?.personKind).toBe("person");
    expect(row?.personKindBy).toBe("user");
    expect(row?.personKindConfidence).toBeNull();

    pendingResults = [];
    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, null);
  });

  it("does not submit a new batch while the previous one is still processing, and keeps its id", async () => {
    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, "msgbatch_still_running");
    isDone = false;
    submittedItems = null;
    const summary = await runPersonClassification();

    expect(summary).toEqual({ scanned: 0, classified: 0, remaining: 0, skipped: "batch_pending" });
    expect(submittedItems).toBeNull(); // phase 2 never ran
    expect(await getPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY)).toBe("msgbatch_still_running");

    isDone = true;
    await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, null);
  });
});
