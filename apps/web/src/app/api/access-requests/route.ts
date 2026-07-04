// Dhaga Cloud only — see packages/ee/LICENSE. This route (and its sibling
// folders api/stripe/** and app/admin/**) statically import @dhaga/ee and
// only function when it's present; self-hosters who remove packages/ee
// should remove these route folders too (the rest of the app builds fine
// without them — see lib/hosted/gate.ts for the routes that stay core).
import { after } from "next/server";
import { submitAccessRequest } from "@dhaga/ee/access-requests";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";

const EMAIL_RE = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;

/**
 * Deliberately public (the one auth-exempt route besides login/signup):
 * visitors request access before they have an account. Accepts an email,
 * nothing else; duplicate requests are idempotent.
 */
export async function POST(request: Request): Promise<Response> {
  // Belt-and-suspenders alongside "delete this folder": even if EE is
  // present (the default after cloning), this route stays inert unless
  // hosted mode is explicitly on — self-hosters never trigger EE's schema
  // just by an unrelated visitor hitting this endpoint.
  if (process.env.DHAGA_HOSTED_MODE !== "true") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
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

  await submitAccessRequest(email);

  if (emailEnabled()) {
    // Confirmation + owner notification go out after the response.
    after(async () => {
      await sendEmail({
        to: email,
        subject: "Your Dhaga access request",
        html: emailShell(
          "Request received",
          `<p>We'll email you as soon as you're approved. Founding-price seats
           are assigned in request order.</p>
           <p>Until then: Dhaga is open source. Watch the build at
           <a href="https://github.com/anchit2000/dhaga" style="color:#e2a44c;">github.com/anchit2000/dhaga</a>.</p>`,
        ),
      });
      const owner = ownerEmail();
      if (owner) {
        await sendEmail({
          to: owner,
          subject: "New Dhaga access request",
          html: emailShell(
            "New access request",
            `<p><strong style="color:#f3ede2;">${email}</strong> requested access.</p>`,
          ),
        });
      }
    });
  }
  return Response.json({ ok: true });
}
