import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, notes } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { markReachedOut, setCadence } from "@/lib/repo/reminders";
import { listQuietContacts, scoreStrength } from "@/lib/repo/strength";
import { DECAY_AFTER_DAYS } from "@/utils/constants/app";

const DAY = 86_400_000;

function person(name: string) {
  return {
    name,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
  };
}

/** Shift a contact's creation (its baseline touch) into the past. */
async function backdateContact(id: string, days: number): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ createdAt: sql`now() - make_interval(days => ${days})` })
    .where(eq(contacts.id, id));
}

async function backdateNote(id: string, days: number): Promise<void> {
  const db = await getDb();
  await db
    .update(notes)
    .set({ createdAt: sql`now() - make_interval(days => ${days})` })
    .where(eq(notes.id, id));
}

describe("relationship strength score", () => {
  const now = Date.now();

  it("an active relationship scores Strong; a silent one decays to Dormant", () => {
    // Recency and frequency both matter: this is what makes the score a
    // prioritisation signal rather than a novelty number.
    const active = scoreStrength(new Date(now - 2 * DAY), 12, now);
    expect(active.label).toBe("Strong");

    const silent = scoreStrength(new Date(now - DECAY_AFTER_DAYS * DAY), 0, now);
    expect(silent.label).toBe("Dormant");
    expect(silent.score).toBeLessThan(active.score);
  });

  it("with equal recency, the more frequent relationship scores higher", () => {
    const touched = new Date(now - 30 * DAY);
    expect(scoreStrength(touched, 6, now).score).toBeGreaterThan(
      scoreStrength(touched, 1, now).score,
    );
  });

  it("a contact with zero interactions ever never produces NaN or a divide-by-zero score", () => {
    const touchedToday = scoreStrength(new Date(now), 0, now);
    expect(Number.isFinite(touchedToday.score)).toBe(true);
    const neverTouched = scoreStrength(new Date(now - 10_000 * DAY), 0, now);
    expect(Number.isFinite(neverTouched.score)).toBe(true);
    expect(neverTouched.score).toBeGreaterThanOrEqual(0);
  });

  it("recency decay is monotonic: touching today always outscores touching earlier, at any fixed frequency", () => {
    // Business logic this guards: the "going quiet" ranking must never
    // invert — a fresher touch can't score lower than a staler one.
    const offsets = [0, 1, 7, 30, 90, 200, 400, 2000];
    for (const interactions of [0, 1, 5, 20]) {
      const scores = offsets.map(
        (days) => scoreStrength(new Date(now - days * DAY), interactions, now).score,
      );
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    }
  });

  it("a future-dated last touch (clock skew) clamps to 'now', it doesn't score above a same-day touch", () => {
    const skewed = scoreStrength(new Date(now + 5 * DAY), 3, now);
    const sameDay = scoreStrength(new Date(now), 3, now);
    expect(skewed.score).toBe(sameDay.score);
  });
});

describe("decay detection (going quiet)", () => {
  it("surfaces only contacts silent past the threshold — the BRD's 'networks decay silently' fix", async () => {
    const quietId = await createContact(person("Asha Quiet"), "manual");
    await backdateContact(quietId, DECAY_AFTER_DAYS + 30);
    const freshId = await createContact(person("Farid Fresh"), "manual");

    const quiet = await listQuietContacts();
    const ids = quiet.map((entry) => entry.id);
    expect(ids).toContain(quietId);
    expect(ids).not.toContain(freshId);
  });

  it("any touch resets decay: a new note takes the contact off the list", async () => {
    const id = await createContact(person("Nadia Noted"), "manual");
    await backdateContact(id, DECAY_AFTER_DAYS + 30);
    await addNote(id, "text", "caught up over coffee");

    const ids = (await listQuietContacts()).map((entry) => entry.id);
    expect(ids).not.toContain(id);
  });

  it("'I reached out' is a touch too", async () => {
    const id = await createContact(person("Ravi Reached"), "manual");
    await backdateContact(id, DECAY_AFTER_DAYS + 30);
    await markReachedOut(id);

    const ids = (await listQuietContacts()).map((entry) => entry.id);
    expect(ids).not.toContain(id);
  });

  it("contacts with a cadence never appear — the cadence feed owns them", async () => {
    const id = await createContact(person("Carla Cadence"), "manual");
    await backdateContact(id, DECAY_AFTER_DAYS + 30);
    await setCadence(id, 90);

    const ids = (await listQuietContacts()).map((entry) => entry.id);
    expect(ids).not.toContain(id);
  });

  it("ranks the stronger fading relationship first — that's the one worth rescuing", async () => {
    const strongerId = await createContact(person("Meera Mattered"), "manual");
    await backdateContact(strongerId, DECAY_AFTER_DAYS + 120);
    // A note inside the frequency window but past the decay threshold:
    // history counts toward strength without counting as a fresh touch.
    const noteId = await addNote(strongerId, "text", "intro'd me to her CTO");
    await backdateNote(noteId, DECAY_AFTER_DAYS + 20);

    const weakerId = await createContact(person("Omar Once"), "manual");
    await backdateContact(weakerId, DECAY_AFTER_DAYS + 120);

    const quiet = await listQuietContacts();
    const strongerRank = quiet.findIndex((entry) => entry.id === strongerId);
    const weakerRank = quiet.findIndex((entry) => entry.id === weakerId);
    expect(strongerRank).toBeGreaterThanOrEqual(0);
    expect(weakerRank).toBeGreaterThanOrEqual(0);
    expect(strongerRank).toBeLessThan(weakerRank);
  });
});
