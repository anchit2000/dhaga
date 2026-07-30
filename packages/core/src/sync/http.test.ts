import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithSyncRetry, isCursorExpired, SyncHttpError } from "./http";

/**
 * What these tests defend.
 *
 * A large address book WILL be throttled mid-run. Every failure mode below is
 * one where a plausible-looking retry loop still loses the user something: a
 * write silently dropped, a throttle made worse, a serverless invocation held
 * open until it dies, or a contact's name pasted into a server log.
 */

/** Fake timers: the point of the loop is WHEN it retries, so time is asserted. */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function reply(status: number, headers: Record<string, string> = {}, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Start the call and attach the rejection assertion in the SAME tick, before
 * timers are advanced. Attaching afterwards lets the rejection surface with no
 * handler, which Node reports as an unhandled rejection even though the test
 * passes.
 */
function expectRejection(pending: Promise<unknown>): Promise<unknown> {
  return pending.catch((error: unknown) => error);
}

function stubFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  const mock = vi.fn();
  for (const response of responses) mock.mockResolvedValueOnce(response);
  // Anything past the queued responses repeats the last one, so "keeps failing"
  // tests do not have to enumerate every attempt.
  mock.mockResolvedValue(responses[responses.length - 1]);
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("fetchWithSyncRetry", () => {
  it("retries a 429 rather than surfacing it as a failed sync", async () => {
    // A 429 reaching the caller becomes a lost write counted into "will retry" —
    // and nothing ever retries it if the cursor advanced past that contact.
    const fetchMock = stubFetch(reply(429), reply(200, {}, { ok: true }));

    const pending = fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits the Retry-After the provider stated, not its own shorter guess", async () => {
    // The first exponential step is ~0.5s. Retrying then, when the provider
    // asked for 10s, is precisely how a throttle becomes a harder throttle.
    const fetchMock = stubFetch(reply(429, { "retry-after": "10" }), reply(200));

    const pending = fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a");

    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(9_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await pending;
  });

  it("treats Google's 403 rateLimitExceeded as a rate limit, not a dead grant", async () => {
    // Google answers a quota breach with 403, not 429. Classifying by status
    // alone would abandon the run on the one error that clears by itself.
    const fetchMock = stubFetch(
      reply(403, {}, { error: { errors: [{ reason: "rateLimitExceeded" }] } }),
      reply(200),
    );

    const pending = fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 403 that is a real permission failure", async () => {
    // A revoked or narrowed grant never heals on retry; retrying only delays
    // the "reconnect this account" the user actually needs to see.
    const fetchMock = stubFetch(
      reply(403, {}, { error: { errors: [{ reason: "insufficientPermissions" }] } }),
    );

    const pending = expectRejection(
      fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a"),
    );
    await vi.runAllTimersAsync();

    expect(await pending).toBeInstanceOf(SyncHttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 401", async () => {
    const fetchMock = stubFetch(reply(401));

    const pending = expectRejection(
      fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a"),
    );
    await vi.runAllTimersAsync();

    expect(await pending).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after a bounded number of attempts instead of retrying forever", async () => {
    // Unbounded retry inside a request is a hung run, not a resilient one.
    const fetchMock = stubFetch(reply(429));

    const pending = expectRejection(
      fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a"),
    );
    await vi.runAllTimersAsync();

    expect(await pending).toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("refuses a Retry-After longer than a request can wait out", async () => {
    // A quota reset can name an hour. Sleeping through it burns the whole
    // invocation and still fails; failing now at least reports the truth.
    const fetchMock = stubFetch(reply(429, { "retry-after": "3600" }));

    const pending = expectRejection(
      fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a"),
    );
    await vi.runAllTimersAsync();

    expect(await pending).toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports the status only, never the provider's error body", async () => {
    // Provider error bodies quote the user's contacts. This message ends up in
    // a server log, so third-party PII must not be able to ride along.
    stubFetch(reply(400, {}, { error: { message: "Invalid person: Priya Raman" } }));

    const pending = expectRejection(
      fetchWithSyncRetry(
        "https://people.test/people/me/connections?syncToken=secret-token",
        {},
        "Google People GET /people/me/connections",
      ),
    );
    await vi.runAllTimersAsync();

    const error = await pending;
    expect(error).toBeInstanceOf(SyncHttpError);
    const message = (error as Error).message;
    expect(message).toContain("HTTP 400");
    expect(message).not.toContain("Priya");
    // The cursor lives in the query string and is a secret in a log.
    expect(message).not.toContain("secret-token");
  });

  it("retries a transient network rejection", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));
    fetchMock.mockResolvedValue(reply(200));
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchWithSyncRetry("https://people.test/a", {}, "Test GET /a");
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("isCursorExpired", () => {
  it("recognises 410 and nothing else", () => {
    // 410 is the ONLY status that means "your cursor is dead, re-enumerate".
    // Widening it would turn an ordinary outage into a needless full sync;
    // narrowing it would leave the connection permanently stuck on a dead token.
    expect(isCursorExpired(new SyncHttpError("Test GET /a", 410))).toBe(true);
    expect(isCursorExpired(new SyncHttpError("Test GET /a", 400))).toBe(false);
    expect(isCursorExpired(new SyncHttpError("Test GET /a", 429))).toBe(false);
    expect(isCursorExpired(new Error("boom"))).toBe(false);
  });
});
