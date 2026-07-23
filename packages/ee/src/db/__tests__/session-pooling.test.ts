import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSessionScopedPooling } from "../bootstrap";

/**
 * Tenant scoping rides on session-level set_config on a pinned backend (see
 * bootstrap.ts). A transaction-mode pooler swaps that backend between queries,
 * which both breaks scoping (RLS returns zero rows) AND can leak a tenant's
 * setting onto a backend later handed to another user — a silent cross-tenant
 * exposure, not a crash. These tests fail exactly when the boot guard stops
 * catching a transaction pooler, or starts refusing a safe session-mode one.
 */
describe("assertSessionScopedPooling", () => {
  const ENV = "DHAGA_ALLOW_TRANSACTION_POOLER";
  const original = process.env[ENV];

  beforeEach(() => {
    delete process.env[ENV];
  });
  afterEach(() => {
    if (original === undefined) delete process.env[ENV];
    else process.env[ENV] = original;
    vi.restoreAllMocks();
  });

  it("throws on Supabase's transaction pooler (port 6543)", () => {
    expect(() =>
      assertSessionScopedPooling("postgres://user:pw@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"),
    ).toThrow(/transaction-mode/i);
  });

  it("allows Supabase's session pooler (same host, port 5432) — the safe, recommended config", () => {
    expect(() =>
      assertSessionScopedPooling("postgres://user:pw@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"),
    ).not.toThrow();
  });

  it("throws on a generic `pooler` hostname (Neon's -pooler endpoint, on 5432)", () => {
    expect(() =>
      assertSessionScopedPooling("postgres://user:pw@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech:5432/db"),
    ).toThrow(/transaction-mode/i);
  });

  it("throws on a `pgbouncer` hostname", () => {
    expect(() => assertSessionScopedPooling("postgres://user:pw@pgbouncer.internal:5432/db")).toThrow();
  });

  it("throws on a `pgbouncer=true` query flag regardless of host", () => {
    expect(() =>
      assertSessionScopedPooling("postgres://user:pw@db.internal:5432/db?pgbouncer=true"),
    ).toThrow();
  });

  it("allows a plain direct connection", () => {
    expect(() => assertSessionScopedPooling("postgres://user:pw@db.internal:5432/postgres")).not.toThrow();
  });

  it("no-ops on an undefined or non-URL connection string (can't be checked here)", () => {
    expect(() => assertSessionScopedPooling(undefined)).not.toThrow();
    expect(() => assertSessionScopedPooling("host=db user=app dbname=postgres")).not.toThrow();
  });

  it("downgrades the throw to a one-time console.warn when DHAGA_ALLOW_TRANSACTION_POOLER=true", () => {
    process.env[ENV] = "true";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const offending = "postgres://user:pw@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";

    expect(() => assertSessionScopedPooling(offending)).not.toThrow();
    expect(() => assertSessionScopedPooling(offending)).not.toThrow();

    // One-time: repeated cold-start checks must not spam the logs.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/DHAGA_ALLOW_TRANSACTION_POOLER/);
  });
});
