import { afterEach, describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { assertCheckoutEmbeddable, CheckoutBlockedError } from "./razorpay-modal";

/**
 * These two suites guard the SAME defect from both ends.
 *
 * Razorpay Standard Checkout renders as a cross-origin iframe from
 * api.razorpay.com, and that document sends no COEP header. A page carrying
 * `Cross-Origin-Embedder-Policy` therefore cannot frame it: Chrome blocks the
 * response (ERR_BLOCKED_BY_RESPONSE) and paints "api.razorpay.com refused to
 * connect" inside an empty modal, with nothing in the console and no rejected
 * promise. That is what shipped, and it made the whole INR flow unbuyable from
 * Settings while looking like a Razorpay outage.
 *
 * So: the config suite keeps the billing route out of cross-origin isolation,
 * and the guard suite keeps the failure loud if it ever drifts back in.
 */

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

const COEP = "Cross-Origin-Embedder-Policy";
const COOP = "Cross-Origin-Opener-Policy";

function valueOf(rule: HeaderRule, key: string): string | undefined {
  return rule.headers.find((h) => h.key === key)?.value;
}

describe("next.config headers — the billing route must not be cross-origin isolated", () => {
  it("opts /app/settings back out of both isolation headers", async () => {
    const rules = (await nextConfig.headers!()) as HeaderRule[];
    const settings = rules.find((r) => r.source.startsWith("/app/settings"));

    // Not "a rule exists": it must clear BOTH halves. Leaving COOP on while
    // dropping COEP would still be un-isolated, but leaving COEP on is exactly
    // the bug — assert the pair so neither can be half-reverted.
    expect(settings, "no /app/settings header rule — Razorpay checkout is blocked").toBeDefined();
    expect(valueOf(settings!, COEP)).toBe("unsafe-none");
    expect(valueOf(settings!, COOP)).toBe("unsafe-none");
  });

  it("declares that opt-out AFTER the /app rule it overrides", async () => {
    const rules = (await nextConfig.headers!()) as HeaderRule[];
    const appIndex = rules.findIndex((r) => r.source === "/app/:path*");
    const settingsIndex = rules.findIndex((r) => r.source.startsWith("/app/settings"));

    // Next applies every matching rule and lets the LAST one win per key, so
    // ordering is load-bearing, not cosmetic: move this rule up and /app/:path*
    // silently re-imposes COEP on settings and the modal dies again.
    expect(appIndex).toBeGreaterThanOrEqual(0);
    expect(settingsIndex).toBeGreaterThan(appIndex);
  });

  it("still isolates the rest of /app, where on-device voice runs", async () => {
    const rules = (await nextConfig.headers!()) as HeaderRule[];
    const app = rules.find((r) => r.source === "/app/:path*");

    // The opt-out is meant to be surgical. If someone "fixes" checkout by
    // dropping isolation across all of /app, threaded-WASM ASR loses
    // SharedArrayBuffer everywhere — a real regression, so pin it.
    expect(valueOf(app!, COEP)).toBe("credentialless");
    expect(valueOf(app!, COOP)).toBe("same-origin");
  });
});

describe("assertCheckoutEmbeddable", () => {
  const original = Reflect.get(globalThis, "window") as unknown;

  afterEach(() => {
    if (original === undefined) Reflect.deleteProperty(globalThis, "window");
    else Reflect.set(globalThis, "window", original);
  });

  function withIsolation(crossOriginIsolated: boolean): void {
    Reflect.set(globalThis, "window", { crossOriginIsolated });
  }

  it("refuses to open on a cross-origin-isolated page", () => {
    withIsolation(true);
    expect(() => assertCheckoutEmbeddable()).toThrow(CheckoutBlockedError);
  });

  it("names COEP in the message, so the cause needs no re-investigation", () => {
    withIsolation(true);
    // The point of the guard is the diagnosis, not the throw: a bare "checkout
    // failed" here would have cost the same investigation all over again.
    expect(() => assertCheckoutEmbeddable()).toThrow(/Cross-Origin-Embedder-Policy/);
  });

  it("allows a page that is not isolated", () => {
    withIsolation(false);
    expect(() => assertCheckoutEmbeddable()).not.toThrow();
  });
});
