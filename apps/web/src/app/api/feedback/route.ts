import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { feedbackSubmissionSchema, sanitizeRoute } from "@/lib/feedback/context";
import { notifyOwnerBestEffort } from "@/lib/feedback/email";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { createFeedback } from "@/lib/repo/feedback";

/**
 * In-app feedback (components/app/AppNav/FeedbackButton).
 *
 * Order is load-bearing: auth → rate limit → validate → persist → email. The DB
 * write happens inside its own short `withUserDb` scope which is CLOSED before
 * the Resend call, so no tenant connection is held across an external HTTP
 * request (PR #92 pool exhaustion), and the email is best-effort — the row is
 * committed and the user is told "sent" whether or not the notification lands.
 *
 * `withUserDb` rather than `mutation()`: this is a route handler, not a server
 * action, so the userId comes from the request (cookie session or API key).
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  try {
    await enforceRateLimit(userId, "feedback");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: "Too many requests — slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } },
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  // Unknown keys are STRIPPED, not rejected: a modified client cannot widen what
  // gets stored, and the fields that survive are pattern-bounded (see the
  // schema's doc comment on the three-layer allow-list).
  const parsed = feedbackSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Write a little more and try again." }, { status: 400 });
  }
  const submission = { ...parsed.data, route: sanitizeRoute(parsed.data.route) };

  await withUserDb(userId, () => createFeedback(submission));
  await notifyOwnerBestEffort(submission, userId);

  return Response.json({ ok: true });
}
