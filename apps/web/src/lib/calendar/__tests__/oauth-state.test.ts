import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signState, verifyState } from "@/lib/calendar/oauth";

/**
 * The signed OAuth `state` is bound to the user who started the flow. This
 * encodes WHY: without the identity binding, a victim's authenticated callback
 * would accept an attacker-minted (validly signed, fresh) state and store the
 * attacker's calendar connection under the victim — a connection-injection
 * CSRF. verifyState must therefore reject a state whose embedded userId does
 * not match the session user at the callback, even when the signature and TTL
 * are perfectly valid.
 */
describe("calendar OAuth state identity binding", () => {
  beforeAll(() => {
    process.env.CALENDAR_TOKEN_SECRET = "test-calendar-state-secret";
  });
  afterAll(() => {
    delete process.env.CALENDAR_TOKEN_SECRET;
  });

  it("verifies a state for the same provider and user that signed it", () => {
    const state = signState("google", "user_1");
    expect(verifyState(state, "google", "user_1")).toBe(true);
  });

  it("rejects a validly signed state presented for a different user", () => {
    const attackerState = signState("google", "attacker");
    // Victim's session at the callback is user_1, not the attacker.
    expect(verifyState(attackerState, "google", "user_1")).toBe(false);
  });

  it("rejects a state whose provider does not match", () => {
    const state = signState("google", "user_1");
    expect(verifyState(state, "outlook", "user_1")).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const state = signState("google", "user_1");
    const [body] = state.split(".");
    expect(verifyState(`${body}.deadbeef`, "google", "user_1")).toBe(false);
  });
});
