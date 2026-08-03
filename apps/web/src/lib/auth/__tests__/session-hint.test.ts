import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_HINT_SCRIPT, hasSessionHint } from "@/lib/auth/session-hint";

/**
 * The hint decides whether a signed-in visitor is shown "Dashboard" or is
 * wrongly asked to sign in again. Two things have to hold for that to be safe:
 * the cookie must be matched as a whole name (a sloppy `indexOf` would let an
 * unrelated cookie masquerade as a session), and the inline script must reach
 * the same verdict as the React component — if they disagreed, the pre-paint DOM
 * and the hydrated render would fight and the button would visibly flip.
 */

interface FakeNode {
  attributes: Record<string, string>;
  setAttribute: (name: string, value: string) => void;
}

function withCookie(cookie: string): void {
  vi.stubGlobal("document", { cookie });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Runs the inline script the Header renders, against a stand-in DOM. */
function runInlineScript(cookie: string): FakeNode {
  const node: FakeNode = {
    attributes: { "data-signed-in": "false" },
    setAttribute(name: string, value: string): void {
      node.attributes[name] = value;
    },
  };
  const doc = {
    cookie,
    querySelector: (selector: string): FakeNode | null =>
      selector === "[data-auth-actions]" ? node : null,
  };
  new Function("document", SESSION_HINT_SCRIPT)(doc);
  return node;
}

describe("session hint", () => {
  it("is absent on the server, so prerendered HTML always ships the signed-out header", () => {
    vi.stubGlobal("document", undefined);
    expect(hasSessionHint()).toBe(false);
  });

  it.each([
    ["no cookies at all", "", false],
    ["the hint alone", "dhaga_signed_in=1", true],
    ["the hint among others", "theme=dark; dhaga_signed_in=1; foo=bar", true],
    ["the hint last", "theme=dark; dhaga_signed_in=1", true],
    // The proxy clears the hint by expiring it; a lingering empty value must not
    // read as a session, or a signed-out visitor gets a Dashboard button.
    ["an emptied hint", "dhaga_signed_in=", false],
    // A cookie whose *name ends with* ours must not match — this is the bug a
    // substring check would ship, and it would show Dashboard to a stranger.
    ["a suffix-named impostor", "evil_dhaga_signed_in=1", false],
    // Nor may the value merely start with 1.
    ["a longer value", "dhaga_signed_in=12", false],
  ])("reads %s as signedIn=%s", (_label, cookie, expected) => {
    withCookie(cookie as string);
    expect(hasSessionHint()).toBe(expected);
  });

  it("the inline script flips the header before paint when a session exists", () => {
    expect(runInlineScript("dhaga_signed_in=1").attributes["data-signed-in"]).toBe("true");
  });

  it("the inline script leaves the signed-out header alone otherwise", () => {
    expect(runInlineScript("theme=dark").attributes["data-signed-in"]).toBe("false");
  });

  it("the inline script agrees with the hydrating component on every case", () => {
    for (const cookie of [
      "",
      "dhaga_signed_in=1",
      "theme=dark; dhaga_signed_in=1; foo=bar",
      "dhaga_signed_in=",
      "evil_dhaga_signed_in=1",
      "dhaga_signed_in=12",
    ]) {
      withCookie(cookie);
      const scriptSaysSignedIn = runInlineScript(cookie).attributes["data-signed-in"] === "true";
      expect(scriptSaysSignedIn, `disagreed on "${cookie}"`).toBe(hasSessionHint());
      vi.unstubAllGlobals();
    }
  });
});
