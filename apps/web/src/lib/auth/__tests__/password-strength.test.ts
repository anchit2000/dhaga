import { describe, expect, it } from "vitest";
import { scorePassword } from "@/lib/auth/password-strength";

/**
 * The meter is advisory, but its labels still have to *mean* something or they
 * mislead users into keeping a bad password. These cases pin the boundaries
 * that carry the intent — length is the floor (it mirrors the server's
 * MIN_PASSWORD_LENGTH), and a single character class can never read as safe no
 * matter how long — so a future tweak to the scoring can't silently promote a
 * guessable password to "Strong".
 */
describe("scorePassword", () => {
  it("treats empty input as weak with no filled segments", () => {
    expect(scorePassword("")).toEqual({ score: 0, level: "weak", label: "Weak" });
  });

  it("is weak below the enforced minimum length, however varied", () => {
    // "Aa1!" is all four classes but only 4 chars — it can't even be submitted,
    // so it must never look stronger than weak.
    expect(scorePassword("Aa1!").level).toBe("weak");
  });

  it("is weak for a single character class even when long", () => {
    // 16 lowercase letters: length alone must not buy a passing grade.
    expect(scorePassword("aaaaaaaaaaaaaaaa").level).toBe("weak");
  });

  it("is fair once it clears the length floor with at least two classes", () => {
    // 9 chars, lower + digit.
    expect(scorePassword("abcdefgh1").level).toBe("fair");
  });

  it("keeps a short-but-varied password at fair, reserving strong for length", () => {
    // 8 chars, all four classes — varied but not long enough for strong.
    expect(scorePassword("Abcdef1!").level).toBe("fair");
  });

  it("is strong only with both length (>=12) and variety (>=3 classes)", () => {
    expect(scorePassword("Abcdef1!xyz2").level).toBe("strong");
  });
});
