import { describe, expect, it } from "vitest";
import nextConfig from "../../../../../next.config";

/**
 * The FA2 layout worker only runs off the main thread if its bundle is allowed
 * to load. `/app` is cross-origin isolated (COOP: same-origin + COEP:
 * credentialless) for on-device voice, and HTML's "check a global object's
 * embedder policy" turns a dedicated worker into a network error whenever the
 * owner document's COEP is compatible with cross-origin isolation but the
 * worker RESPONSE's own COEP is not — same-origin buys no exemption, that is a
 * CORP rule and a different check. Turbopack emits the worker under
 * `/_next/static/chunks/`, so without a header rule there Chrome answers its
 * own 200 with ERR_BLOCKED_BY_RESPONSE, `worker.onerror` fires, and every graph
 * silently lays out with a multi-second synchronous main-thread FA2 pass
 * (measured at ~2.5s on the load-test graph). That is invisible in tests and in
 * the UI — the graph still renders — so the header rule is the only thing
 * standing between the fast path and a silent regression.
 */
describe("graph layout worker cross-origin isolation", () => {
  it("serves bundler chunks with a COEP compatible with the isolated /app shell", async () => {
    const rules = await nextConfig.headers!();

    const isolating = ["credentialless", "require-corp"];
    const staticRule = rules.find((rule) => rule.source.startsWith("/_next/static"));
    expect(staticRule, "no /_next/static header rule — the worker would be blocked").toBeDefined();
    const coep = staticRule!.headers.find(
      (header) => header.key.toLowerCase() === "cross-origin-embedder-policy",
    );
    expect(coep?.value).toBeDefined();
    expect(isolating).toContain(coep!.value);
  });

  it("still isolates /app — the reason the chunk rule is needed", async () => {
    // If /app ever stops being isolated the rule above becomes dead weight
    // rather than load-bearing; this pins the pairing so the two move together.
    const rules = await nextConfig.headers!();
    const appRule = rules.find((rule) => rule.source === "/app/:path*");
    const coep = appRule?.headers.find(
      (header) => header.key.toLowerCase() === "cross-origin-embedder-policy",
    );

    expect(coep?.value).toBe("credentialless");
  });
});
