import { after } from "next/server";
import { getDb } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { emailEnabled, emailShell, sendEmail } from "@/lib/email/send";

const EMAIL_RE = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;

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
  const db = await getDb();
  await db.insert(waitlist).values({ email }).onConflictDoNothing();
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
