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

export type {
  BillingCadence,
  FoundingOffer,
  PlanOffer,
  PlanChangeOffer,
  CurrentPlanState,
  PlanSummary,
  BillingGate,
} from "./billing-types";

/**
 * Hosted pending-approval gate ("payment is the invite"). Signup is open on a
 * hosted instance, but the new account is UNAPPROVED: it can authenticate and
 * reach /pending, the checkout that pays for it, and sign-out — nothing else.
 * Approval comes from an admin approving the access request, from a payment the
 * processor has CONFIRMED (webhook only — never at checkout-intent time), or
 * from an admin comp plan.
 *
 * Permissive by default: without packages/ee, isApproved is always true and
 * approve is a no-op, so a self-hosted core instance has no gate whatsoever.
 */
export interface ApprovalGate {
  /** Pass the request's already-scoped connection to avoid a second checkout
   *  from the small tenant pool — `user` has no RLS, so a scoped connection
   *  reads it identically. Optional: the auth guards have no scoped db yet at
   *  the point they ask, and memoize the answer per request instead. */
  isApproved(userId: string, db?: DhagaDb): Promise<boolean>;
  /** Idempotent grant, used at signup for an email an admin already approved. */
  approve(userId: string): Promise<void>;
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
