import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import type { DhagaDb } from "@/lib/db";

/**
 * Open-core extension points (same dependency-inversion pattern as
 * packages/core's LLMClient gateway). Core never imports `@dhaga/ee`
 * directly or references its types — only through this dynamic, try/catch'd
 * import — so a self-hoster can delete packages/ee entirely and the app
 * still typechecks, builds, and runs with every gate falling back to its
 * permissive default below.
 */
export interface ScopedConnection {
  /** Run `fn` inside ONE tenant-scoped transaction on the pinned backend and
   *  commit — or roll back and rethrow if it throws. The tenant id is applied
   *  as a TRANSACTION-LOCAL Postgres setting (the transaction's first
   *  statement), so it is gone the moment the transaction ends: nothing leaks
   *  into the next checkout, and no session-level reset is needed. This is the
   *  path withUserDb (and, via cachePerUser, every cached read) takes, and it
   *  is what makes the same code correct on both a session-mode pooler (5432)
   *  and a transaction-mode pooler (6543) — flipping pooler is a DATABASE_URL
   *  change, no code change. EE owns the Postgres mechanics and stays
   *  framework-agnostic; putting `scopedDb` into the ambient store so repo
   *  getDb() resolves to it is the caller's job — see db/request-scope.ts. */
  run<T>(fn: (scopedDb: DhagaDb) => Promise<T>): Promise<T>;
  /** Open the tenant transaction now and return its db, held open until
   *  release(). For the request-lifetime pin (RSC page reads via
   *  getRequestScopedDb), where there is no single callback to wrap in run().
   *  Same transaction-local tenant setting as run(); every read on the returned
   *  db runs inside that one transaction, so each is RLS-scoped even on a
   *  transaction-mode pooler (an autocommit statement would otherwise land on a
   *  backend with no tenant setting — RLS then returns no rows, failing closed,
   *  never leaking). The returned db is a live transaction: do NOT open a
   *  nested top-level `db.transaction()` on it (it would end the scope's
   *  transaction early). */
  begin(): Promise<DhagaDb>;
  /** Return the pinned Postgres connection to the pool once run()/begin() is
   *  done. No session reset — the transaction-local setting self-cleared at
   *  COMMIT/ROLLBACK — so this is safe under session- AND transaction-mode
   *  pooling. Awaitable: for begin() it commits the held transaction first, so
   *  await it wherever the caller might otherwise suspend. EE owns the Postgres
   *  mechanics; the Next.js-specific "when" (after()) is the caller's job — see
   *  db/request-scope.ts. */
  release(): void | Promise<void>;
}

export interface TenantGate {
  /** Null in core-only mode: caller falls back to the plain global getDb(). */
  scopedDb(userId: string): Promise<ScopedConnection | null>;
}

export interface SignupGate {
  checkEmail(email: string): Promise<{ allowed: boolean; reason?: string }>;
  /** Called when a signup attempt is blocked — files (or no-ops, in core
   *  mode) an access request so the same email can just retry once approved
   *  instead of needing the separate /api/access-requests form first. True
   *  only when a new pending request was created (or an old rejection was
   *  reopened after the cooldown) — callers use it to avoid re-sending a
   *  confirmation email on every signup retry. */
  requestAccess(email: string): Promise<boolean>;
}

export interface PlanSummary {
  plan: "free" | "pro" | "lifetime";
  status: string | null;
  hasStripeCustomer: boolean;
}

export interface BillingGate {
  /** Pass the request's already-scoped connection so the entitlement read
   *  reuses it instead of opening a second checkout from the small tenant pool
   *  (the AI-metering hot path — see lib/ai/metering). Optional: callers off
   *  the hot path (e.g. settings render) may omit it. */
  hasUnlimitedAi(userId: string, db?: DhagaDb): Promise<boolean>;
  /** Null in core-only mode — the settings page renders no billing UI at
   *  all when this is null, so self-hosters never see a "buy" button for a
   *  product not for sale on their instance. */
  getPlanSummary(userId: string): Promise<PlanSummary | null>;
  createCheckoutUrl(userId: string, plan: "pro" | "lifetime"): Promise<string>;
  createPortalUrl(userId: string): Promise<string>;
}

export interface AdminGate {
  /** Pass the request's already-scoped connection so the isAdmin read reuses it
   *  instead of opening a second checkout from the small tenant pool (the
   *  app-shell nav-cache path — see lib/cache/app-navigation.ts). Optional:
   *  callers off that path (e.g. requireAdminForPage) may omit it. */
  isAdmin(userId: string, db?: DhagaDb): Promise<boolean>;
}

/** Advocate-facing summary of a user's referral standing (hosted only). */
export interface ReferralSummary {
  code: string;
  rewardedCount: number;
  pendingCount: number;
}

export interface ReferralGate {
  getOrCreateCode(userId: string): Promise<string>;
  /** Null in core-only mode → the referral UI renders nothing (like billing). */
  getSummary(userId: string): Promise<ReferralSummary | null>;
  /** Gates the signup-allowlist bypass: true if `code` is real + usable. */
  isValidCode(code: string): Promise<boolean>;
  /** Record a pending referrer→referee link at signup; idempotent per referee. */
  recordReferral(input: {
    code: string;
    refereeUserId: string;
    refereeEmail: string;
  }): Promise<{ recorded: boolean; reason?: string }>;
  /** Fire the two-sided reward once the referee verifies their email.
   *  Idempotent; grants a Pro month to BOTH sides. */
  grantRewardOnVerification(id: string): Promise<{ rewarded: boolean }>;
}

const openSignupGate: SignupGate = {
  checkEmail: async () => ({ allowed: true }),
  requestAccess: async () => false,
};
const noBillingGate: BillingGate = {
  hasUnlimitedAi: async () => false,
  getPlanSummary: async () => null,
  createCheckoutUrl: async () => {
    throw new Error("Billing isn't available on this instance.");
  },
  createPortalUrl: async () => {
    throw new Error("Billing isn't available on this instance.");
  },
};
const noAdminGate: AdminGate = { isAdmin: async () => false };
const noReferralGate: ReferralGate = {
  getOrCreateCode: async () => {
    throw new Error("Referrals aren't available on this instance.");
  },
  getSummary: async () => null,
  isValidCode: async () => false,
  recordReferral: async () => ({ recorded: false, reason: "unavailable" }),
  grantRewardOnVerification: async () => ({ rewarded: false }),
};
const noTenantGate: TenantGate = { scopedDb: async () => null };

async function loadEe(): Promise<typeof import("@dhaga/ee") | null> {
  if (process.env.DHAGA_HOSTED_MODE !== "true") return null;
  try {
    return await import("@dhaga/ee");
  } catch {
    return null; // e.g. a self-hoster who deleted packages/ee but left the flag set
  }
}

export async function getTenantGate(): Promise<TenantGate> {
  return (await loadEe())?.tenantGate ?? noTenantGate;
}
export async function getSignupGate(): Promise<SignupGate> {
  return (await loadEe())?.signupGate ?? openSignupGate;
}
export async function getBillingGate(): Promise<BillingGate> {
  return (await loadEe())?.billingGate ?? noBillingGate;
}
export async function getAdminGate(): Promise<AdminGate> {
  return (await loadEe())?.adminGate ?? noAdminGate;
}
export async function getReferralGate(): Promise<ReferralGate> {
  return (await loadEe())?.referralGate ?? noReferralGate;
}

/**
 * Per-page admin gate — defense in depth alongside app/admin/layout.tsx, so
 * authorization sits next to the data fetch and doesn't rely on layout
 * rendering semantics. Memoized per-request (like getCurrentUser) so the
 * layout and the page sharing a request cost one isAdmin lookup. 404s
 * non-admins — a non-admin shouldn't distinguish "doesn't exist" from
 * "exists but you're blocked". Returns the current user id on success.
 */
export const requireAdminForPage = cache(async (): Promise<string> => {
  const userId = await requireUserIdForPage();
  const isAdmin = await (await getAdminGate()).isAdmin(userId);
  if (!isAdmin) notFound();
  return userId;
});
