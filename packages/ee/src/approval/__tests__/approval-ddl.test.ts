import { describe, expect, it } from "vitest";
import { EE_TABLES_DDL } from "../../db/tables-ddl";

/**
 * The pending-approval column ships to a database with live accounts in it.
 * Two things about that DDL are load-bearing, and both are silent when wrong:
 *
 *  1. Every pre-existing account MUST be backfilled as approved in the same
 *     migration. They signed up under the old wall, where approval happened
 *     before the account existed; leaving them null locks out every real
 *     production user the moment the guard ships.
 *  2. The backfill must run EXACTLY once. This whole DDL string is replayed
 *     whenever its text changes (db/ddl-history.ts fingerprints it), so an
 *     unguarded `UPDATE ... WHERE approved_at IS NULL` would silently approve
 *     everyone legitimately waiting on the next unrelated schema edit — the
 *     waiting list would quietly stop existing.
 */
describe("approved_at DDL", () => {
  it("adds the column idempotently, without touching core's own auth DDL", () => {
    expect(EE_TABLES_DDL).toContain(
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS approved_at timestamptz;',
    );
  });

  it("backfills existing accounts as approved", () => {
    expect(EE_TABLES_DDL).toMatch(/UPDATE "user"\s+SET approved_at = now\(\)/);
  });

  it("guards the backfill behind a one-shot marker row, so a replay is a no-op", () => {
    const backfill = EE_TABLES_DDL.slice(EE_TABLES_DDL.indexOf("backfill-user-approval-v1"));
    // The marker insert must be conditional...
    expect(backfill).toContain("ON CONFLICT DO NOTHING");
    // ...and the UPDATE must depend on it having actually inserted.
    expect(backfill).toMatch(/EXISTS \(SELECT 1 FROM applied\)/);
  });
});
