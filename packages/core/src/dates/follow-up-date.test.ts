import { describe, expect, it } from "vitest";
import { resolveDatePhrase } from "./follow-up-date";

const THURSDAY = { year: 2026, month: 8, day: 6 };

describe("resolveDatePhrase", () => {
  it("resolves exact relative offsets without an LLM", () => {
    expect(resolveDatePhrase("10 days from now", THURSDAY)).toEqual({
      kind: "exact",
      date: { year: 2026, month: 8, day: 16 },
    });
    expect(resolveDatePhrase("by tomorrow", THURSDAY)).toEqual({
      kind: "exact",
      date: { year: 2026, month: 8, day: 7 },
    });
    expect(resolveDatePhrase("in 2 weeks", THURSDAY)).toEqual({
      kind: "exact",
      date: { year: 2026, month: 8, day: 20 },
    });
  });

  it("resolves named weekdays from the supplied user day", () => {
    expect(resolveDatePhrase("by Saturday", THURSDAY)).toEqual({
      kind: "exact",
      date: { year: 2026, month: 8, day: 8 },
    });
    expect(resolveDatePhrase("next Monday", THURSDAY)).toEqual({
      kind: "exact",
      date: { year: 2026, month: 8, day: 10 },
    });
  });

  it("defaults an ambiguous weekend to Saturday and preserves Sunday", () => {
    expect(resolveDatePhrase("next weekend", THURSDAY)).toEqual({
      kind: "ambiguous",
      date: { year: 2026, month: 8, day: 8 },
      alternatives: [
        { year: 2026, month: 8, day: 8 },
        { year: 2026, month: 8, day: 9 },
      ],
      reason: "weekend",
    });
  });

  it("rejects invalid exact dates and leaves vague prose unresolved", () => {
    expect(resolveDatePhrase("2026-02-30", THURSDAY)).toEqual({ kind: "unresolved" });
    expect(resolveDatePhrase("sometime after the launch", THURSDAY)).toEqual({
      kind: "unresolved",
    });
  });
});
