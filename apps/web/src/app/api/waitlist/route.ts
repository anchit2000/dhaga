import { getDb } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

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
  return Response.json({ ok: true });
}
