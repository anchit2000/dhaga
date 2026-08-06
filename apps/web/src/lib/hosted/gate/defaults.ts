import type {
  AdminGate,
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
export const noBillingGate: BillingGate = {
  hasUnlimitedAi: async () => false,
  getPlanSummary: async () => null,
  createCheckoutUrl: async () => {
    throw new Error("Billing isn't available on this instance.");
  },
  createPortalUrl: async () => {
    throw new Error("Billing isn't available on this instance.");
  },
};
export const noAdminGate: AdminGate = { isAdmin: async () => false };
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
