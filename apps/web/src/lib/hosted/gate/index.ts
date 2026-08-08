/**
 * Open-core extension points (same dependency-inversion pattern as
 * packages/core's LLMClient gateway). Split per the 150-line rule: ./types
 * (the gate interfaces), ./defaults (permissive/no-op fallbacks), ./loader
 * (the dynamic `@dhaga/ee` import + getXGate() accessors), ./admin
 * (requireAdminForPage), ./billing-types (the billing gate's own shapes).
 * Import path stays `@/lib/hosted/gate`.
 */
export type {
  AdminGate,
  ApprovalGate,
  BillingCadence,
  BillingGate,
  CurrentPlanState,
  FoundingOffer,
  PlanChangeOffer,
  PlanOffer,
  PlanSummary,
  ReferralGate,
  ReferralSummary,
  ScopedConnection,
  SignupGate,
  TenantGate,
} from "./types";
export {
  getAdminGate,
  getApprovalGate,
  getBillingGate,
  getReferralGate,
  getSignupGate,
  getTenantGate,
} from "./loader";
export { requireAdminForPage } from "./admin";
