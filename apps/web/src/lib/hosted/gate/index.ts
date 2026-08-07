/**
 * Open-core extension points (same dependency-inversion pattern as
 * packages/core's LLMClient gateway). Split per the 150-line rule: ./types
 * (the gate interfaces), ./defaults (permissive/no-op fallbacks), ./loader
 * (the dynamic `@dhaga/ee` import + getXGate() accessors), ./admin
 * (requireAdminForPage). Import path stays `@/lib/hosted/gate`.
 */
export type {
  AdminGate,
  BillingGate,
  PlanSummary,
  ReferralGate,
  ReferralSummary,
  ScopedConnection,
  SignupGate,
  TenantGate,
} from "./types";
export {
  getAdminGate,
  getBillingGate,
  getReferralGate,
  getSignupGate,
  getTenantGate,
} from "./loader";
export { requireAdminForPage } from "./admin";
