/**
 * Disposable test/demo accounts that must NEVER receive product emails or
 * other outbound notifications. Centralised here so every recipient path
 * (jobs, digests, future per-user fan-out) filters the same set.
 *
 * The `@dhaga.internal` domain is the primary net — it covers the seeded
 * load-test user AND any `demo-*@dhaga.internal` demo account. The explicit
 * id/email lists are belt-and-suspenders for the documented seed identities
 * (CLAUDE.md "Local / E2E testing").
 */

/** Any address on this domain is a throwaway test/demo account. */
export const DUMMY_EMAIL_DOMAIN = "@dhaga.internal";

/** Seeded load-test / demo user ids that are never real people. */
export const DUMMY_USER_IDS: readonly string[] = ["dummy-loadtest-user"];

/** Explicit throwaway addresses (already covered by the domain, listed for clarity). */
export const DUMMY_EMAILS: readonly string[] = ["loadtest@dhaga.internal"];
