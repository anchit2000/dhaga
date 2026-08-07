import type {
  AdminGate,
  ApprovalGate,
  BillingGate,
  ReferralGate,
  SignupGate,
  TenantGate,
} from "./types";
import {
  noAdminGate,
  noBillingGate,
  noReferralGate,
  noTenantGate,
  openApprovalGate,
  openSignupGate,
} from "./defaults";

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
export async function getApprovalGate(): Promise<ApprovalGate> {
  return (await loadEe())?.approvalGate ?? openApprovalGate;
}
export async function getAdminGate(): Promise<AdminGate> {
  return (await loadEe())?.adminGate ?? noAdminGate;
}
export async function getReferralGate(): Promise<ReferralGate> {
  return (await loadEe())?.referralGate ?? noReferralGate;
}
