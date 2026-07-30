import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDraftPrompt,
  buildNoteExtractionPrompt,
  type CompleteOptions,
  type ExtractOptions,
  type LLMClient,
  type LLMResult,
} from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { listNodeTypes } from "@/lib/repo/node-types";
import { addNote } from "@/lib/repo/notes";
import { getSchedulePrefs, setSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { generateFollowUpDraft } from "@/lib/ai/draft";

/**
 * WHY THIS EXISTS: `todayLine()` takes a calendar day, but a builder can only
 * use the day its CALLER hands it. While every web caller omitted it, prompts
 * said the UTC date — so a user in UTC-7 capturing "follow up next Tuesday" at
 * 18:00 local was already on the next UTC day and the model resolved every
 * relative date one day late. prompt-dates.test.ts guards the other half of the
 * contract (the date sits in the VOLATILE user prompt, never the cached system
 * one); this file guards the threading.
 *
 * The last test is the safety property: `SchedulePrefs.timezone` defaults to
 * "UTC", which is server-local in hosted mode, so a user who never picked a zone
 * must get a BYTE-IDENTICAL prompt to the pre-threading one — asserted against
 * the builders called the old way, with no `today` argument at all.
 */

// A fixed instant where UTC and the user's zone are on DIFFERENT calendar days:
// 02:00 UTC is 19:00 the previous evening in Los Angeles (UTC-7 in March).
const INSTANT = new Date("2026-03-10T02:00:00Z");
const UTC_DAY = "2026-03-10";
const USER_ZONE = "America/Los_Angeles";
const USER_DAY = "2026-03-09";

const { extractRequests, completeRequests } = vi.hoisted(() => ({
  extractRequests: [] as ExtractOptions<unknown>[],
  completeRequests: [] as CompleteOptions[],
}));

vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  // One payload that satisfies BOTH consumers exercised here (note extraction
  // and the capture parser), so the stub needs no schema sniffing.
  const data = {
    facts: [],
    relationships: [],
    follow_ups: [],
    tags: [],
  };
  const client: LLMClient = {
    extract: async <T,>(options: ExtractOptions<T>): Promise<LLMResult<T>> => {
      extractRequests.push(options as ExtractOptions<unknown>);
      return { data: data as unknown as T, model: "test-stub", usage: { inputTokens: 5, outputTokens: 5 } };
    },
    complete: async (options: CompleteOptions): Promise<LLMResult<string>> => {
      completeRequests.push(options);
      return { data: "Drafted.", model: "test-stub", usage: { inputTokens: 5, outputTokens: 5 } };
    },
    streamComplete: async () => {
      throw new Error("streamComplete is not exercised by this test");
    },
  };
  return { ...actual, hasLLM: () => true, getLLMClient: () => client };
});

// Follow-ups born in extraction get pushed to a write-enabled calendar after the
// response; irrelevant here and it would reach for OAuth state.
vi.mock("@/lib/calendar/write-out", () => ({
  scheduleCalendarWriteOutForNote: () => undefined,
}));

const NOTE_BODY = "follow up next Tuesday";
let contactId = "";
let noteId = "";

beforeAll(async () => {
  contactId = await createContact(
    { name: "Sam Rivera", title: null, company: null, emails: [], phones: [], links: [], location: null },
    "manual",
  );
  noteId = await addNote(contactId, "text", NOTE_BODY);
});

beforeEach(() => {
  // Cloud AI is paid (free cap = 0); without budget assertAiBudget throws
  // before any prompt is built and every assertion below would be vacuous.
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "100000");
  // Fake ONLY Date: the timers the PGlite/pg drivers rely on must stay real.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(INSTANT);
  extractRequests.length = 0;
  completeRequests.length = 0;
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  // Leave the shared settings row on its default so ordering can't leak a zone.
  await setSchedulePrefs({ ...(await getSchedulePrefs()), timezone: "UTC" });
});

async function setZone(timezone: string): Promise<void> {
  await setSchedulePrefs({ ...(await getSchedulePrefs()), timezone });
}

describe("prompts carry the USER's calendar day, not the server's", () => {
  it("note extraction names the user's zone's date, not UTC's", async () => {
    await setZone(USER_ZONE);

    const outcome = await extractAndApplyNote(
      "user-1",
      contactId,
      noteId,
      "Sam Rivera",
      NOTE_BODY,
    );

    expect(outcome.failed).toBe(false);
    expect(extractRequests).toHaveLength(1);
    const prompt = extractRequests[0]?.prompt ?? "";
    // The whole point: "next Tuesday" must be resolved from the 9th (the user's
    // evening), not the 10th (UTC, where it is already tomorrow).
    expect(prompt).toContain(`Today's date: ${USER_DAY}`);
    expect(prompt).not.toContain(UTC_DAY);
  });

  it("follow-up drafts name the user's zone's date, not UTC's", async () => {
    await setZone(USER_ZONE);

    const result = await generateFollowUpDraft("user-1", contactId);

    expect(result.error).toBeUndefined();
    expect(completeRequests).toHaveLength(1);
    const prompt = completeRequests[0]?.prompt ?? "";
    expect(prompt).toContain(`Today's date: ${USER_DAY}`);
    expect(prompt).not.toContain(UTC_DAY);
  });

  it("a user on the default UTC zone gets byte-identical prompts to before", async () => {
    await setZone("UTC");

    await extractAndApplyNote("user-1", contactId, noteId, "Sam Rivera", NOTE_BODY);
    await generateFollowUpDraft("user-1", contactId);

    // Built exactly as the callers built them BEFORE threading: no `today`
    // argument at all. Byte equality, not `toContain` — the safety property is
    // that nothing else about the prompt shifted either.
    const nodeTypes = (await listNodeTypes()).map(({ name, slug }) => ({ name, slug }));
    expect(extractRequests[0]?.prompt).toBe(
      buildNoteExtractionPrompt("Sam Rivera", NOTE_BODY, nodeTypes),
    );
    expect(completeRequests[0]?.prompt).toBe(
      buildDraftPrompt({
        contactName: "Sam Rivera",
        title: null,
        company: null,
        eventNames: [],
        facts: [],
        noteSnippets: [NOTE_BODY],
      }),
    );
  });
});
