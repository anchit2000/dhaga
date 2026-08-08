import type {
  AdminGate,
  ApprovalGate,
  BillingGate,
  ReferralGate,
  SignupGate,
  TenantGate,
} from "./types";

/** Permissive/no-op fallbacks used when packages/ee isn't loaded (core-only
 *  self-host, or DHAGA_HOSTED_MODE unset) — see loadEe() in ./loader. */
export const openSignupGate: SignupGate = {
  checkEmail: async () => ({ allowed: true }),
  requestAccess: async () => false,
};
function noBilling(): never {
  throw new Error("Billing isn't available on this instance.");
}
export const noBillingGate: BillingGate = {
  hasUnlimitedAi: async () => false,
  getPlanSummary: async () => null,
  // Nothing is for sale without packages/ee, least of all a capped seat whose
  // cap this instance has no table to enforce.
  getFoundingOffer: async () => null,
  // Nothing is for sale, so no currency is charged — /pricing renders its
  // default display currency and quotes nothing as authoritative.
  getSaleOffers: async () => ({ stripe: [], razorpay: [] }),
  // No-op rather than noBilling(): the settings page calls this unconditionally
  // before rendering, and a core-only self-host must not throw on a page load
  // just because it has no processor to reconcile against.
  reconcilePlan: async () => undefined,
  createCheckoutUrl: async () => noBilling(),
  createPortalUrl: async () => noBilling(),
  changePlan: async () => noBilling(),
  cancelPlan: async () => noBilling(),
  resumePlan: async () => noBilling(),
  revertScheduledChange: async () => noBilling(),
};
export const noAdminGate: AdminGate = { isAdmin: async () => false };
/** No waiting list without packages/ee — every account is approved on sight. */
export const openApprovalGate: ApprovalGate = {
  isApproved: async () => true,
  approve: async () => undefined,
};
export const noReferralGate: ReferralGate = {
  getOrCreateCode: async () => {
    throw new Error("Referrals aren't available on this instance.");
  },
  getSummary: async () => null,
  isValidCode: async () => false,
  recordReferral: async () => ({ recorded: false, reason: "unavailable" }),
  grantRewardOnVerification: async () => ({ rewarded: false }),
};
export const noTenantGate: TenantGate = { scopedDb: async () => null };
