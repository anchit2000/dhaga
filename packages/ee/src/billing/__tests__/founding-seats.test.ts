import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EE_TABLES_DDL } from "../../db/tables-ddl";

/**
 * WHY THIS SUITE EXISTS: "the first 500 seats" is a promise made on a public
 * page, and the only thing that keeps it true is server-side. The browser is
 * told how many seats are left purely so it can render a number; it is never
 * asked whether one may be sold.
 *
 * The claim's ATOMICITY is a property of Postgres — a UNIQUE index serialising
 * two inserts of the same seat number — and is asserted here on the DDL text
 * plus the retry behaviour it implies. The fake below emulates the two
 * outcomes the design depends on (a conflict, and the cap's WHERE clause both
 * yielding zero rows); it does not re-prove that Postgres honours its indexes.
 */
let claimed = 0;
let ownSeat: number | null = null;
const inserts: Array<{ rows: Array<{ seat_no: number }> }> = [];
let executeCalls = 0;

vi.mock("../repo/connection", () => ({
  billingDb: async () => ({
    select: (fields: Record<string, unknown>) => ({
      from: () =>
        Object.assign("n" in fields ? [{ n: claimed }] : [], {
          where: () => (ownSeat === null ? [] : [{ seatNo: ownSeat }]),
        }),
    }),
    execute: async () => {
      executeCalls += 1;
      return inserts.shift() ?? { rows: [] };
    },
  }),
}));

const { claimFoundingSeat } = await import("../founding/repo");
const { FOUNDING_SEAT_CAP } = await import("../founding/cap");
const { getFoundingOffer } = await import("../founding");

const ENV_KEYS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_PLAN_PRO_FOUNDING_YEARLY"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  claimed = 0;
  ownSeat = null;
  executeCalls = 0;
  inserts.length = 0;
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    process.env[key] = "configured";
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("claiming a founding seat", () => {
  it("hands out the seat the insert returned", () => {
    inserts.push({ rows: [{ seat_no: 12 }] });
    return expect(claimFoundingSeat("user-1")).resolves.toBe(12);
  });

  it("refuses once the cap is reached, without retrying", async () => {
    // The cap is a WHERE clause on the insert, so a full house comes back as
    // zero rows — the same shape as losing a race. Distinguishing them is what
    // stops a sold-out claim from spinning through the retry loop.
    claimed = FOUNDING_SEAT_CAP;
    expect(await claimFoundingSeat("user-1")).toBeNull();
    expect(executeCalls).toBe(1);
  });

  it("retries when another buyer took the same seat number", async () => {
    // THE race: both buyers compute max(seat_no)+1 and both insert it. The
    // UNIQUE index picks a winner; the loser must take the next number rather
    // than give up and be told the offer is gone while 490 seats remain.
    claimed = 10;
    inserts.push({ rows: [] }, { rows: [{ seat_no: 11 }] });
    expect(await claimFoundingSeat("user-1")).toBe(11);
    expect(executeCalls).toBe(2);
  });

  it("re-uses the seat this user already holds instead of burning another", async () => {
    // Re-opening checkout (or double-clicking) must not consume two of 500.
    ownSeat = 7;
    expect(await claimFoundingSeat("user-1")).toBe(7);
    expect(executeCalls).toBe(0);
  });

  it("throws rather than quietly selling standard Pro after repeated collisions", async () => {
    claimed = 10;
    await expect(claimFoundingSeat("user-1")).rejects.toThrow(/founding seat/i);
  });
});

describe("offering the seat at all", () => {
  it("withholds the offer when the plan id isn't configured", async () => {
    // Same rule as availableCombinations: never render a price this instance
    // has no way to charge.
    delete process.env.RAZORPAY_PLAN_PRO_FOUNDING_YEARLY;
    expect(await getFoundingOffer()).toBeNull();
  });

  it("withholds the offer when the seats are gone", async () => {
    claimed = FOUNDING_SEAT_CAP;
    expect(await getFoundingOffer()).toBeNull();
  });

  it("reports what is left while seats remain", async () => {
    claimed = 480;
    expect(await getFoundingOffer()).toEqual({
      plan: "pro",
      cadence: "founding_yearly",
      seatCap: FOUNDING_SEAT_CAP,
      seatsRemaining: 20,
    });
  });
});

describe("the seat table's DDL", () => {
  it("makes seat_no UNIQUE — that index IS the cap enforcement", () => {
    // Without it, two concurrent claims both read "499 taken" under READ
    // COMMITTED and both insert, and a public scarcity claim is broken.
    expect(EE_TABLES_DDL).toMatch(/seat_no integer NOT NULL UNIQUE/);
    expect(EE_TABLES_DDL).toMatch(/user_id text PRIMARY KEY/);
  });
});
