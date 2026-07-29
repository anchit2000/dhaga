/** Runs `work` when the limiter's next slot is free; resolves/rejects with it. */
export type RateLimitedRunner = <T>(work: () => Promise<T>) => Promise<T>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes async work through one promise chain, starting each task at
 * least `minIntervalMs` after the previous task STARTED.
 *
 * Why this exists: geocoding providers publish hard request-rate ceilings
 * (Nominatim's usage policy is an absolute maximum of 1 req/s, and breaching
 * it gets the deployment blocked, not throttled). A ceiling enforced by
 * caller discipline is not enforced at all — some future batch job will loop
 * over 500 contacts. So the client owns the gate: whatever the caller does,
 * requests physically cannot leave faster than the interval.
 *
 * Deliberately not a dependency (p-limit/bottleneck): ~15 lines of promise
 * chaining, no scheduling policy beyond FIFO, and no configuration surface.
 *
 * A rejected task does NOT break the chain — the next task still runs, and is
 * still spaced. Callers get the original rejection.
 */
export function createRateLimiter(minIntervalMs: number): RateLimitedRunner {
  let chain: Promise<void> = Promise.resolve();
  // Never-run sentinel: Date.now() - -Infinity is Infinity, so the first task
  // waits a negative amount of time, i.e. starts immediately.
  let lastStartedAt = Number.NEGATIVE_INFINITY;

  return <T>(work: () => Promise<T>): Promise<T> => {
    const result: Promise<T> = chain.then(async () => {
      const waitMs = minIntervalMs - (Date.now() - lastStartedAt);
      if (waitMs > 0) await sleep(waitMs);
      // Stamped at START, not completion: the ceiling is on requests issued
      // per second, so a slow request already "spent" its share of the window.
      lastStartedAt = Date.now();
      return work();
    });
    // The chain tracks completion only — it swallows both the value (so
    // results aren't retained) and the rejection (so one failure can't poison
    // every later task). `result` keeps the real outcome for the caller.
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
