import { describe, expect, it } from "vitest";
import { guessNames } from "@/lib/messaging/process-session/names";

/**
 * THE RECALL FILTER. `guessNames` decides which existing contacts the batch
 * planner is even shown — it runs BEFORE the one planning call, without an LLM,
 * purely to seed the candidate query.
 *
 * It is not allowed to decide anything. Its only obligation is that the real
 * person is IN the pool: a false positive costs one wasted OR clause in one
 * query, while a missed name costs a duplicate contact the user merges by hand,
 * and — worse — hides from the planner that this person already exists. So every
 * case here is about recall, and the asymmetry is the reason.
 *
 * No mocks and no fixture: it is a pure function over text, which is the point
 * of keeping it out of the model's hands.
 */
const BIO =
  "https://linkedin.com/in/priyaraman — Priya Raman is the founder of Lumen Labs. Introduced to me by Neha Kulkarni.";

describe("names a batch might be about", () => {
  it("finds the full name AND its bare first name", () => {
    // WHY: the first name on its own is what pulls the OTHER Priyas into the
    // pool. Without them the planner never learns there are three near-misses
    // and cannot be judged on choosing to create a new person anyway — the
    // decision at the centre of the batch that broke.
    const names = guessNames([BIO]);
    expect(names).toContain("Priya Raman");
    expect(names).toContain("Priya");
    expect(names).toContain("Neha Kulkarni");
  });

  it("is not defeated by a capital that merely opens a sentence", () => {
    // "Introduced" is capitalised only because the sentence starts there. It must
    // be stripped WITHOUT taking the name after it — dropping the whole run is
    // how a real person silently misses the pool.
    expect(guessNames(["Introduced to me by Neha Kulkarni"])).toEqual([
      "Neha Kulkarni",
      "Neha",
    ]);
    // A directive names nobody, so it must contribute nothing to the query.
    expect(guessNames(["Create a new contact"])).toEqual([]);
    // …but a name that happens to start a sentence is still a name.
    expect(guessNames(["Priya Raman is the founder"])).toContain("Priya Raman");
  });

  it("finds names outside the Latin alphabet", () => {
    // WHY: this product's users do not all write in Latin script. A naive [A-Z]
    // would quietly never match a whole class of names, so every one of those
    // users would silently get duplicate contacts forever — the failure would
    // look like "the AI is bad at Russian names" rather than a regex bug.
    const names = guessNames(["Вчера познакомился с Мария Иванова на конференции"]);
    expect(names).toContain("Мария Иванова");
    expect(names).toContain("Мария");
  });
});
