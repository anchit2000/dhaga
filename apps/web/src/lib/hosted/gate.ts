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
  db: DhagaDb;
  /** Must be called once the request is done with `db` (releases the
   *  underlying Postgres connection). EE owns Postgres connection mechanics
   *  and stays framework-agnostic; the Next.js-specific "when" (after()) is
   *  the caller's job — see db/request-scope.ts. */
  release(): void;
}

export interface TenantGate {
  /** Null in core-only mode: caller falls back to the plain global getDb(). */
  scopedDb(userId: string): Promise<ScopedConnection | null>;
}

export interface SignupGate {
  checkEmail(email: string): Promise<{ allowed: boolean; reason?: string }>;
}

export interface PlanSummary {
  plan: "free" | "pro" | "lifetime";
  status: string | null;
  hasStripeCustomer: boolean;
}

export interface BillingGate {
  hasUnlimitedAi(userId: string): Promise<boolean>;
  /** Null in core-only mode — the settings page renders no billing UI at
   *  all when this is null, so self-hosters never see a "buy" button for a
   *  product not for sale on their instance. */
  getPlanSummary(userId: string): Promise<PlanSummary | null>;
  createCheckoutUrl(userId: string, plan: "pro" | "lifetime"): Promise<string>;
  createPortalUrl(userId: string): Promise<string>;
}

export interface AdminGate {
  isAdmin(userId: string): Promise<boolean>;
}

const openSignupGate: SignupGate = {
  checkEmail: async () => ({ allowed: true }),
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
const noAdminGate: AdminGate = {
  isAdmin: async () => false,
};
const noTenantGate: TenantGate = {
  scopedDb: async () => null,
};

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
