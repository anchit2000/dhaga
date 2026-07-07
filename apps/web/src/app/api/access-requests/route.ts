// Dhaga Cloud only — see packages/ee/LICENSE. This route (and its sibling
// folders api/stripe/** and app/admin/**) statically import @dhaga/ee and
// only function when it's present; self-hosters who remove packages/ee
// should remove these route folders too (the rest of the app builds fine
// without them — see lib/hosted/gate.ts for the routes that stay core).
import { after } from "next/server";
import { submitAccessRequest } from "@dhaga/ee/access-requests";
import { notifyAccessRequested } from "@/lib/access/notify";
import type {
  AccessRequestErrorResponse,
  AccessRequestResponse,
} from "@dhaga/core/src/api/access-requests";

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
    return Response.json(
      { error: "Not found." } satisfies AccessRequestErrorResponse,
      { status: 404 },
    );
  }
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = String(body.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    return Response.json(
      { error: "Invalid request." } satisfies AccessRequestErrorResponse,
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json(
      { error: "Enter a valid email." } satisfies AccessRequestErrorResponse,
      { status: 400 },
    );
  }

  await submitAccessRequest(email);

  // Confirmation + owner notification go out after the response.
  after(() => notifyAccessRequested(email));
  return Response.json({ ok: true } satisfies AccessRequestResponse);
}
