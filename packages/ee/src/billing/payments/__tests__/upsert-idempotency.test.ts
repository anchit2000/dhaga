import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The ledger's write is the one piece of this change that money depends on and
 * that no unit test could otherwise see, because its whole behaviour lives in
 * an ON CONFLICT clause. So the real `recordPayment` runs here against a pool
 * stub that captures the SQL instead of executing it — the assertions are on
 * what Postgres would actually be asked to do, not on a copy of the query kept
 * in the test (which could drift from the code and never fail).
 */
interface Captured {
  text: string;
  values: unknown[];
}
const captured: Captured[] = [];
const fakePool = {
  // node-postgres accepts (text, values), ({ text, values }) and
  // ({ text }, values); drizzle has used more than one shape across versions,
  // so take the text and the bound parameters from wherever they arrived.
  query: async (...args: unknown[]) => {
    const first = args[0] as { text?: string } | string;
    const values = args.find(Array.isArray) as unknown[] | undefined;
    captured.push({
      text: typeof first === "string" ? first : (first.text ?? ""),
      values: values ?? [],
    });
    return { rows: [], rowCount: 0 };
  },
};
vi.mock("../../../db/pool", () => ({ getPool: () => fakePool }));
vi.mock("../../../db/bootstrap", () => ({ ensureEeSchema: async () => undefined }));

const { recordPayment } = await import("../repo");

function sqlText(): string {
  return captured.map((c) => c.text).join("\n").toLowerCase();
}

describe("payment ledger upsert", () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it("dedupes on processor_payment_id rather than reading first", async () => {
    // A read-then-write dedupe loses under at-least-once delivery: two
    // concurrent redeliveries both see "absent" and both insert. The UNIQUE
    // index is the mechanism, so there must be exactly one statement and it
    // must be an upsert.
    await recordPayment({
      userId: "u1",
      processor: "razorpay",
      processorPaymentId: "pay_1",
      status: "captured",
      amountMinor: 79900,
      currency: "INR",
    });
    expect(captured).toHaveLength(1);
    expect(sqlText()).toContain('on conflict ("processor_payment_id") do update');
  });

  it("never lets a redelivered capture un-refund a payment", async () => {
    // The one ordering hazard that costs real money: `subscription.charged`
    // redelivered AFTER a refund would otherwise flip the row back to captured
    // and make a refunded charge look good in the reconciliation.
    await recordPayment({
      userId: "u1",
      processor: "razorpay",
      processorPaymentId: "pay_1",
      status: "captured",
    });
    expect(sqlText()).toContain(
      "where not (excluded.status = 'captured' and \"payments\".\"status\" in ('refunded', 'partially_refunded', 'disputed'))",
    );
  });

  it("fills in what an earlier writer didn't know, and overwrites nothing it did", async () => {
    // The Razorpay confirm path records the charge without an amount (only the
    // webhook carries the payment entity). The webhook must be able to complete
    // that row — and a later writer that knows LESS must not blank it.
    await recordPayment({
      userId: "u1",
      processor: "razorpay",
      processorPaymentId: "pay_1",
      status: "captured",
    });
    const text = sqlText();
    for (const column of ["amount_minor", "currency", "plan", "cadence", "occurred_at"]) {
      expect(text).toContain(`coalesce("payments"."${column}", excluded.${column})`);
    }
    // Identity is never rewritten: a conflicting write must not be able to move
    // a charge onto a different account.
    expect(text).not.toContain('set "user_id"');
    expect(text).not.toMatch(/"user_id" = excluded/);
  });

  it("stores an unknown amount as NULL, never as a fabricated zero", async () => {
    await recordPayment({
      userId: "u1",
      processor: "razorpay",
      processorPaymentId: "pay_1",
      status: "captured",
    });
    // Parameter order follows the column order in the insert; the amount and
    // the processor timestamp are the two a partial writer legitimately lacks.
    expect(captured[0].values).toContain(null);
    expect(captured[0].values).not.toContain(0);
  });
});
