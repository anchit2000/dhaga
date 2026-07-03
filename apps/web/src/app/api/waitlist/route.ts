import { after } from "next/server";
import { getDb } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";

const EMAIL_RE = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;

/**
 * Stores the signup. The embedded DB needs a writable filesystem — on
 * serverless hosts (Vercel) it throws, so signups fall back to a
 * notification email to the owner. A signup is only "ok" once at least one
 * of the two persisted.
 */
async function storeSignup(email: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.insert(waitlist).values({ email }).onConflictDoNothing();
    return true;
  } catch {
    const to = ownerEmail();
    if (!emailEnabled() || !to) return false;
    const sent = await sendEmail({
      to,
      subject: "New Dhaga waitlist signup",
      html: emailShell(
        "New waitlist signup",
        `<p><strong style="color:#f3ede2;">${email}</strong> joined the waitlist.
         (Stored via email because the deployment has no persistent database.)</p>`,
      ),
    });
    return sent.ok;
  }
}

/**
 * Deliberately public (the one auth-exempt route besides login): visitors
 * join the waitlist before they have an account. Accepts an email, nothing
 * else; duplicate signups are idempotent.
 */
export async function POST(request: Request): Promise<Response> {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = String(body.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const stored = await storeSignup(email);
  if (!stored) {
    return Response.json(
      { error: "Signups are briefly unavailable — email us instead." },
      { status: 503 },
    );
  }
  if (emailEnabled()) {
    // Confirmation goes out after the response; failures are non-fatal.
    after(() =>
      sendEmail({
        to: email,
        subject: "You're on the Dhaga waitlist",
        html: emailShell(
          "You're on the list",
          `<p>Thanks for reserving a spot. First invites go out before autumn
           conference season — founding seats are assigned in signup order.</p>
           <p>Until then: Dhaga is open source. Watch the build at
           <a href="https://github.com/anchit2000/dhaga" style="color:#e2a44c;">github.com/anchit2000/dhaga</a>.</p>`,
        ),
      }),
    );
  }
  return Response.json({ ok: true });
}
