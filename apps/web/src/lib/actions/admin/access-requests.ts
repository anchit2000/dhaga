"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { reviewAccessRequest } from "@dhaga/ee/access-requests";
import { requireUserId } from "@/lib/auth/guard";
import { getAdminGate } from "@/lib/hosted/gate";
import { emailEnabled, emailShell, sendEmail } from "@/lib/email/send";

async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!(await (await getAdminGate()).isAdmin(userId))) throw new Error("Forbidden");
  return userId;
}

export async function approveAccessRequestAction(formData: FormData): Promise<void> {
  const adminUserId = await requireAdmin();
  const email = String(formData.get("email") ?? "");
  if (!email) return;
  await reviewAccessRequest(email, "approved", adminUserId);
  if (emailEnabled()) {
    await sendEmail({
      to: email,
      subject: "You're in — sign up for Dhaga",
      html: emailShell(
        "You're approved",
        `<p>Your access request was approved. Create your account:</p>
         <p><a href="${process.env.BETTER_AUTH_URL ?? ""}/signup?email=${encodeURIComponent(email)}" style="color:#e2a44c;">Sign up for Dhaga</a></p>`,
      ),
    });
  }
  revalidatePath("/app/admin/access-requests");
}

export async function rejectAccessRequestAction(formData: FormData): Promise<void> {
  const adminUserId = await requireAdmin();
  const email = String(formData.get("email") ?? "");
  if (!email) return;
  await reviewAccessRequest(email, "rejected", adminUserId);
  revalidatePath("/app/admin/access-requests");
}
