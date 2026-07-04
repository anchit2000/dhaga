import { isEmailApproved } from "./repo";

function isBootstrapAdmin(email: string): boolean {
  return (process.env.DHAGA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export const signupGate = {
  // DHAGA_ADMIN_EMAILS bypasses the access-request check too, not just the
  // isAdmin check — otherwise the first admin could never sign up at all:
  // approval requires an admin, and there isn't one until someone signs up.
  checkEmail: async (email: string) => {
    if (isBootstrapAdmin(email)) return { allowed: true };
    const allowed = await isEmailApproved(email);
    return allowed
      ? { allowed: true }
      : { allowed: false, reason: "This email hasn't been invited yet — request access first." };
  },
};

export * from "./repo";
export type { AccessRequestRow, AccessRequestStatus } from "../db/schema";
