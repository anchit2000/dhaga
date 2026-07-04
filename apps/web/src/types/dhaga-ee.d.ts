/**
 * Ambient fallback shape for the optional, proprietary `@dhaga/ee` package
 * (see src/lib/hosted/gate.ts). When packages/ee is present, its own real
 * types are used instead — this declaration only keeps core typechecking
 * and building cleanly when a self-hoster has deleted packages/ee.
 */
declare module "@dhaga/ee" {
  import type {
    AdminGate,
    BillingGate,
    SignupGate,
    TenantGate,
  } from "@/lib/hosted/gate";

  export const tenantGate: TenantGate; // see ScopedConnection in lib/hosted/gate.ts
  export const signupGate: SignupGate;
  export const billingGate: BillingGate;
  export const adminGate: AdminGate;
}
