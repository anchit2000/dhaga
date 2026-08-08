import { describe, expect, it } from "vitest";
import { EE_TABLES_DDL } from "../../db/tables-ddl";

/**
 * The payment ledger ships to a database with live subscriptions in it. Four
 * things about that DDL are load-bearing, and every one of them is silent when
 * wrong — which is why they are asserted on the DDL TEXT rather than left to be
 * discovered on a production deploy.
 */
describe("payments ledger DDL", () => {
  it("is additive only — no destructive statement anywhere in the EE schema", () => {
    // The production database holds data that cannot be recreated. A DROP or
    // TRUNCATE reaching this string would run against it on the next replay.
    expect(EE_TABLES_DDL).not.toMatch(/\bDROP\s+(TABLE|COLUMN|DATABASE)\b/i);
    expect(EE_TABLES_DDL).not.toMatch(/\bTRUNCATE\b/i);
  });

  it("makes processor_payment_id UNIQUE — that index IS the idempotency mechanism", () => {
    // Both processors deliver at-least-once and the Razorpay confirm path races
    // its own webhook. Without this, a redelivered event is a duplicate charge
    // in the ledger and the reconciliation is worthless.
    expect(EE_TABLES_DDL).toMatch(/processor_payment_id text NOT NULL UNIQUE/);
  });

  it("stores money as an INTEGER of minor units", () => {
    // Not numeric, not double precision. Rounding a reconciliation defeats it.
    expect(EE_TABLES_DDL).toMatch(/amount_minor integer/);
    expect(EE_TABLES_DDL).not.toMatch(/amount_minor (numeric|decimal|real|double)/i);
  });

  it("keeps the processor's own timestamp separate from ours", () => {
    // occurred_at is what a settlement report reconciles against; created_at is
    // only when we heard about it. Collapsing them loses the former.
    expect(EE_TABLES_DDL).toMatch(/occurred_at timestamptz/);
    expect(EE_TABLES_DDL).toMatch(/created_at timestamptz NOT NULL DEFAULT now\(\)/);
  });

  it("guards the ledger backfill behind a one-shot marker row", () => {
    // This whole DDL string is replayed whenever its text changes
    // (db/ddl-history.ts fingerprints it), so an ungated INSERT would re-fire on
    // every unrelated schema edit for the rest of the instance's life.
    const backfill = EE_TABLES_DDL.slice(
      EE_TABLES_DDL.indexOf("backfill-payments-from-subscriptions-v1"),
    );
    expect(backfill).toContain("ON CONFLICT DO NOTHING");
    expect(backfill).toMatch(/EXISTS \(SELECT 1 FROM applied\)/);
  });

  it("seeds the backfill from the pre-ledger scalar, so old refunds still resolve", () => {
    // Refund revocation now resolves the account through the ledger. Every
    // payment id we already hold must therefore be IN it, or a refund of a
    // pre-ledger charge resolves to nobody and the account keeps its access.
    const backfill = EE_TABLES_DDL.slice(
      EE_TABLES_DDL.indexOf("backfill-payments-from-subscriptions-v1"),
    );
    expect(backfill).toMatch(/FROM subscriptions s/);
    expect(backfill).toMatch(/s\.razorpay_payment_id IS NOT NULL/);
    // No invented amount: the processor was never asked what those charges were.
    expect(backfill).not.toMatch(/amount_minor/);
  });

  it("adds the denormalised plan-state columns idempotently", () => {
    // These are what take the processor round-trip off every entitlement check.
    for (const column of ["cadence", "scheduled_plan", "scheduled_cadence", "scheduled_change_at", "synced_at"]) {
      expect(EE_TABLES_DDL).toContain(
        `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ${column} `,
      );
    }
  });
});
