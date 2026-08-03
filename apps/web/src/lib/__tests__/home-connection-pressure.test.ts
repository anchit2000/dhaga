import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import { loadDashboardData } from "@/components/app/home/DashboardSection";
import { getDb } from "@/lib/db/request-scope";
import { createContact } from "@/lib/repo/contacts";
import { createGoal } from "@/lib/repo/goals";
import { recordGoalMatchRun } from "@/lib/repo/goals";
import { HOME_DB_ROUND_TRIP_BUDGET, HOME_SETTINGS_ROUND_TRIP_BUDGET } from "@/utils/constants/home";

/**
 * Rule 9 tripwire for the /app Home read path.
 *
 * WHY THIS MATTERS, not just what it measures. An RSC page render pins ONE
 * tenant connection for the whole request (lib/db/request-scope.ts memoizes
 * getDb() with React `cache()`), and node-postgres runs one query at a time on a
 * client — so Home's `Promise.all` buys no parallelism at all. Every query it
 * issues is a SERIAL round-trip that extends how long the request holds one of
 * the THREE slots in the tenant pool (packages/ee/src/db/pool.ts), and the pool
 * is per-instance: the longer each Home render holds its slot, the fewer /app
 * requests an instance can serve before newcomers queue behind
 * connectionTimeoutMillis and a navigation appears to hang. Round-trip count IS
 * the connection pressure here.
 *
 * So the budget is not cosmetic: it fails if someone re-introduces a read the
 * page already has in hand — the two that regressed before being collapsed were
 * five identical single-key `settings` lookups and a second full goal-cohort
 * join. Raising the number is a deliberate act with a reason, never a reflex.
 */

interface CountingClient {
  query: (...args: unknown[]) => unknown;
}

interface LoggedQuery {
  sql: string;
  params: unknown[];
}

let queries: LoggedQuery[] = [];

async function withQueryLog<T>(work: () => Promise<T>): Promise<T> {
  const store = globalThis as unknown as { __dhagaClient?: CountingClient };
  const client = store.__dhagaClient;
  if (!client) throw new Error("expected the embedded PGlite client to be initialised");
  const original = client.query.bind(client);
  queries = [];
  client.query = (...args: unknown[]) => {
    queries.push({
      sql: String(args[0]).replace(/\s+/g, " "),
      params: Array.isArray(args[1]) ? args[1] : [],
    });
    return original(...args);
  };
  try {
    return await work();
  } finally {
    client.query = original;
  }
}

describe("Home's data path stays inside its round-trip budget", () => {
  beforeAll(async () => {
    await getDb();
    // A goal WITH a cohort: the state in which the goal read used to run twice
    // (burn-down strip + suggestion slice). An empty graph would not catch it.
    const contactId = await createContact(
      { ...emptyExtractedContact(), name: `Cohort ${randomUUID()}` },
      "manual",
    );
    const goal = await createGoal("Meet people who work on developer tools");
    await recordGoalMatchRun(goal.id, [{ contactId, fit: 90 }]);
  });

  it("issues no more DB round-trips than the budget allows", async () => {
    await withQueryLog(() => loadDashboardData());
    expect(
      queries.length,
      `Home issued ${queries.length} DB round-trips (budget ${HOME_DB_ROUND_TRIP_BUDGET}).\n` +
        `Every one is serial on the single connection the render pins.\n${queries.map((q) => `  ${q.sql.slice(0, 120)}`).join("\n")}`,
    ).toBeLessThanOrEqual(HOME_DB_ROUND_TRIP_BUDGET);
  });

  it("never fetches the same settings key twice, and batches the rest", async () => {
    await withQueryLog(() => loadDashboardData());
    const settingsReads = queries.filter((query) => /from "settings"/.test(query.sql));
    const keys = settingsReads.flatMap((query) =>
      query.params.filter((param): param is string => typeof param === "string"),
    );
    const repeated = keys.filter((key, index) => keys.indexOf(key) !== index);
    // The invariant that actually regressed: `schedule_prefs` was fetched three
    // times in one render because three callers each wanted one field of it.
    expect(
      repeated,
      `Settings key(s) fetched more than once in a single Home render: ${repeated.join(", ")}. Read it once and pass it down.`,
    ).toEqual([]);
    expect(
      settingsReads.length,
      `${settingsReads.length} separate round-trips to the settings table (budget ${HOME_SETTINGS_ROUND_TRIP_BUDGET}) — fold the new key into the batched read (lib/repo/settings/kv.ts, getSettings).`,
    ).toBeLessThanOrEqual(HOME_SETTINGS_ROUND_TRIP_BUDGET);
  });

  it("loads the active goal's cohort exactly once", async () => {
    await withQueryLog(() => loadDashboardData());
    const cohortReads = queries.filter((query) => /from "goal_members"/.test(query.sql));
    expect(
      cohortReads.length,
      `The goal cohort join ran ${cohortReads.length}× in one Home render — load it once and inject it into both the progress strip and the daily slice (lib/repo/goals/cohort.ts).`,
    ).toBe(1);
  });
});
