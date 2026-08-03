import { z } from "zod";
import {
  FEEDBACK_APP_VERSION_PATTERN,
  FEEDBACK_LOCALE_PATTERN,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_ROUTE_MAX_LENGTH,
  FEEDBACK_TIMEZONE_PATTERN,
  FEEDBACK_USER_AGENT_MAX_LENGTH,
  FEEDBACK_VIEWPORT_PATTERN,
} from "@/utils/constants/feedback";

/**
 * What a feedback report is allowed to carry, and nothing else.
 *
 * The product's privacy stance (CLAUDE.md) forbids collecting contact PII, note
 * text, extraction output or search queries. A feedback box is exactly where
 * that leaks by accident, so the allow-list is enforced three times over: this
 * schema strips unknown keys, the per-field patterns make the surviving fields
 * too narrow to smuggle prose through, and the table has a named column per
 * field (no jsonb). `message` is the single free-text field, and the user typed
 * it on purpose, for the maintainer.
 *
 * Deliberately absent and never to be added: contact names or ids, note or
 * transcript text, search terms, DOM/page snapshots, clipboard, referrer,
 * IP address, or any third-party analytics id.
 */
export const feedbackSubmissionSchema = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_MAX_LENGTH),
  route: z.string().trim().min(1).max(FEEDBACK_ROUTE_MAX_LENGTH),
  viewport: z.string().regex(FEEDBACK_VIEWPORT_PATTERN).nullish(),
  userAgent: z.string().trim().max(FEEDBACK_USER_AGENT_MAX_LENGTH).nullish(),
  locale: z.string().regex(FEEDBACK_LOCALE_PATTERN).nullish(),
  timezone: z.string().regex(FEEDBACK_TIMEZONE_PATTERN).nullish(),
  appVersion: z.string().regex(FEEDBACK_APP_VERSION_PATTERN).nullish(),
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;

/** The context half of a submission — what the disclosure line describes. */
export type FeedbackContext = Omit<FeedbackSubmission, "message">;

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Concrete path + Next's resolved dynamic params → the ROUTE PATTERN.
 * `/app/people/9f1c…` with `{ id: "9f1c…" }` becomes `/app/people/[id]`.
 *
 * This is the whole reason a contact identifier never reaches the feedback
 * table. Substituting by VALUE (rather than trusting a hand-written list of
 * dynamic routes) means a new dynamic segment is redacted the day it ships,
 * with no second place to remember to update.
 */
export function routePattern(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const byValue = new Map<string, string>();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const part of Array.isArray(value) ? value : [value]) {
      if (part) byValue.set(part, `[${key}]`);
    }
  }
  return pathname
    .split("/")
    .map((segment) => byValue.get(segment) ?? byValue.get(safeDecode(segment)) ?? segment)
    .join("/");
}

/**
 * Server-side backstop on `route`. `usePathname()` already excludes the query
 * string, but a search query (`?q=<a person's name>`) is precisely the forbidden
 * payload, so the server drops anything past `?` or `#` rather than trusting the
 * client to have done it.
 */
export function sanitizeRoute(route: string): string {
  const cut = Math.min(
    ...[route.indexOf("?"), route.indexOf("#")].filter((i) => i >= 0),
    route.length,
  );
  return route.slice(0, cut).trim() || "/";
}

/**
 * The line shown UNDER the textarea before the user submits. Silent collection
 * is the thing the product's privacy stance forbids, so everything captured is
 * named here in plain language — if a field is added above and not read here,
 * that is a bug.
 */
export function describeAttached(context: FeedbackContext): string {
  const parts = [
    `page ${context.route}`,
    context.viewport ? `${context.viewport} screen` : null,
    context.locale,
    context.timezone,
    context.appVersion ? `build ${context.appVersion}` : null,
    "your browser version",
    "your account",
  ].filter((part): part is string => Boolean(part));
  return `Attached: ${parts.join(" · ")}.`;
}
