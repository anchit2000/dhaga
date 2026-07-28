import { describe, expect, it } from "vitest";
import { routeNoteCapture } from "./route";

/**
 * These tests encode the product WHY, not just the branch table:
 * a note is attached silently ONLY on a confident single match, ANY ambiguity
 * asks first, and a non-match offers to create — so we never write a note onto
 * the wrong person or drop it on the floor.
 */
describe("routeNoteCapture", () => {
  it("falls through to contact-add when the text is not a note about a person", () => {
    // Even if the DB happens to contain matching names, a non-note must NOT be
    // routed as a note — the contact-add flow owns raw contact details.
    expect(
      routeNoteCapture({
        isNoteAboutPerson: false,
        candidateCount: 3,
        confidentSingleMatch: true,
      }),
    ).toBe("not_note");
  });

  it("attaches silently on a confident single match", () => {
    // The whole point of auto-detect: one unambiguous person ⇒ no interruption.
    expect(
      routeNoteCapture({
        isNoteAboutPerson: true,
        candidateCount: 1,
        confidentSingleMatch: true,
      }),
    ).toBe("attach");
  });

  it("asks to create a new contact when nobody matches", () => {
    // A note about someone not yet in the graph must not be lost — offer to
    // create them (name prefilled) and attach.
    expect(
      routeNoteCapture({
        isNoteAboutPerson: true,
        candidateCount: 0,
        confidentSingleMatch: false,
      }),
    ).toBe("confirm_create");
  });

  it("confirms which person when several plausibly match", () => {
    expect(
      routeNoteCapture({
        isNoteAboutPerson: true,
        candidateCount: 2,
        confidentSingleMatch: false,
      }),
    ).toBe("confirm_ambiguous");
  });

  it("confirms rather than guessing when the ONE candidate is only a fuzzy match", () => {
    // A single first-name/prefix hit is NOT confident: attaching to the wrong
    // "Anchit" is worse than a one-tap confirmation. This is the load-bearing
    // case that a plain candidateCount===1 heuristic would get wrong.
    expect(
      routeNoteCapture({
        isNoteAboutPerson: true,
        candidateCount: 1,
        confidentSingleMatch: false,
      }),
    ).toBe("confirm_ambiguous");
  });
});
