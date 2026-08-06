/**
 * Why this layer exists: a name the user taught must never mis-transcribe again.
 * These tests pin that promise — they fail if the phonetic key strategy or the
 * over-correction guard regresses, not merely if some string changed.
 */
import { describe, it, expect } from "vitest";
import { DoubleMetaphoneDictionary, phoneticKeys } from "./phonetic";
import type { VocabTerm } from "../types";

/** Build a VocabTerm the way the store would: keys derived from term + aliases. */
function makeTerm(term: string, aliases: string[] = []): VocabTerm {
  const keys = [
    ...new Set([...phoneticKeys(term), ...aliases.flatMap((a) => phoneticKeys(a))]),
  ];
  return { term, aliases, keys, boost: 8, createdAt: 0, updatedAt: 0 };
}

const RANCHIT = makeTerm("Ranchit", ["Rran chit", "Rrankit", "Rahnchit"]);

function dictWith(...terms: VocabTerm[]): DoubleMetaphoneDictionary {
  const dict = new DoubleMetaphoneDictionary();
  dict.rebuild(terms);
  return dict;
}

describe("phoneticKeys", () => {
  it("gives a multi-word alias the SAME primary key as the one-word canonical", () => {
    // The whole feature rests on this: "ran chit" (two words) must collapse onto
    // "anchit" (one word). Joining per-word codes with no separator is what makes
    // that true — join with a space and this equality breaks, killing correction.
    expect(phoneticKeys("Rran chit")).toContain("RNXT");
    expect(phoneticKeys("Ranchit")).toContain("RNXT");
  });

  it("captures the secondary code so near-spellings still index (Rrankit → Ranchit)", () => {
    // "Rrankit"'s primary equals "Ranchit"'s SECONDARY code; without indexing the
    // secondary key the most common mis-spelling would slip through uncorrected.
    expect(phoneticKeys("Rrankit")).toContain("RNKT");
    expect(phoneticKeys("Ranchit")).toContain("RNKT");
  });

  it("is case- and punctuation-insensitive", () => {
    expect(phoneticKeys("an, chit")).toEqual(phoneticKeys("An Chit"));
  });
});

describe("DoubleMetaphoneDictionary.correct", () => {
  it("recovers a taught name from a two-token mis-transcription, once", () => {
    const { text, edits } = dictWith(RANCHIT).correct("hi my name is ran chit");
    expect(text).toBe("hi my name is Ranchit");
    expect(edits).toHaveLength(1);
    expect(edits[0]).toEqual({ before: "ran chit", after: "Ranchit", reason: "taught spelling" });
  });

  it("recovers a taught name from a single-token alias mis-spelling", () => {
    const { text, edits } = dictWith(RANCHIT).correct("hi my name is rankit");
    expect(text).toBe("hi my name is Ranchit");
    expect(edits.map((e) => e.after)).toEqual(["Ranchit"]);
  });

  it("preserves surrounding punctuation and casing outside the match", () => {
    const { text, edits } = dictWith(RANCHIT).correct("Hi, ran chit!");
    expect(text).toBe("Hi, Ranchit!");
    expect(edits[0].before).toBe("ran chit");
  });

  it("does NOT re-correct text already spelled canonically (no edit loop)", () => {
    // If the guard compared phonetics without checking the surface, a correct
    // transcript would keep emitting spurious edits every utterance. It must not.
    const { text, edits } = dictWith(RANCHIT).correct("hi my name is Ranchit");
    expect(text).toBe("hi my name is Ranchit");
    expect(edits).toHaveLength(0);
  });

  it("leaves ordinary prose with no taught terms completely untouched", () => {
    const sentence = "the quick brown fox jumps over the lazy dog";
    const { text, edits } = dictWith(RANCHIT).correct(sentence);
    expect(text).toBe(sentence);
    expect(edits).toHaveLength(0);
  });

  it("leaves an untaught homophone alone (only taught vocab is rewritten)", () => {
    // "flour"/"flower" are homophones but neither is taught — the dictionary must
    // not invent corrections for words it was never asked to learn.
    const { text, edits } = dictWith(RANCHIT).correct("we need flour and flowers");
    expect(text).toBe("we need flour and flowers");
    expect(edits).toHaveLength(0);
  });

  it("is a no-op when nothing has been taught", () => {
    const { text, edits } = dictWith().correct("hi my name is ran chit");
    expect(text).toBe("hi my name is ran chit");
    expect(edits).toHaveLength(0);
  });
});
