import { emailEnabled, emailShell, sendEmail } from "@/lib/email/send";
import { AI_ALLOWANCE_PLAN_LABELS } from "@/utils/constants/ai-budget";
import { formatDate } from "@/utils/format-date";

/** Local to this module — admin-typed free text (a grant reason) lands in an
 *  email body and must not be interpreted as markup. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Tells a user an admin made them whole with AI credits — same no-op-when-
 *  unconfigured pattern as lib/access/notify.ts. */
export async function notifyCreditsGranted(
  email: string,
  credits: number,
  reason: string,
  endsAt: Date | null,
): Promise<void> {
  if (!emailEnabled()) return;
  const expiry = endsAt ? `They're available until ${formatDate(endsAt)}.` : "These don't expire.";
  await sendEmail({
    to: email,
    subject: `${credits} AI credits added to your Dhaga account`,
    html: emailShell(
      "Credits added",
      `<p>We added <strong style="color:#f3ede2;">${credits} AI credits</strong> to your account: ${escapeHtml(reason)}.</p>
       <p>${expiry}</p>`,
    ),
  });
}

/** Tells a user their plan changed (admin-managed, not a Stripe checkout). */
export async function notifyPlanChanged(
  email: string,
  plan: "free" | "pro" | "lifetime",
): Promise<void> {
  if (!emailEnabled()) return;
  const label = AI_ALLOWANCE_PLAN_LABELS[plan];
  await sendEmail({
    to: email,
    subject: `Your Dhaga plan is now ${label}`,
    html: emailShell(
      "Plan updated",
      `<p>Your Dhaga plan was changed to <strong style="color:#f3ede2;">${label}</strong>.</p>`,
    ),
  });
}
