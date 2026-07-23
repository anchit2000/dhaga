import { beforeAll, describe, expect, it } from "vitest";
import { signState, verifyState } from "@/lib/calendar/oauth";

beforeAll(() => {
  process.env.CALENDAR_TOKEN_SECRET = "test-secret-for-calendar-oauth-state-abc123";
});

describe("calendar OAuth state binding", () => {
  it("accepts a state verified with the same provider and same user", () => {
    const state = signState("google", "user-alice");
    expect(verifyState(state, "google", "user-alice")).toBe(true);
  });

  it("rejects a state minted for one user when verified as another", () => {
    // The OAuth-CSRF regression: a valid signed state carries the initiating
    // user's id. An attacker who mints a state for their own account must not
    // have it validate under a victim's session — otherwise the callback would
    // save the attacker's calendar tokens under the victim's account.
    const attackerState = signState("google", "user-attacker");
    expect(verifyState(attackerState, "google", "user-victim")).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const state = signState("google", "user-alice");
    const [body, sig] = state.split(".");
    const tampered = `${body}.${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`;
    expect(verifyState(tampered, "google", "user-alice")).toBe(false);
  });

  it("rejects a mismatched provider", () => {
    const state = signState("google", "user-alice");
    expect(verifyState(state, "outlook", "user-alice")).toBe(false);
  });
});
