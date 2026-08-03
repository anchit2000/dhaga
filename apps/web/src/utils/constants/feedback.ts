/** In-app feedback box (components/app/AppNav/FeedbackButton). */

/** Long enough for a paragraph of prose, short enough that nobody pastes a log. */
export const FEEDBACK_MAX_LENGTH = 2000;

/**
 * Upper bounds on the attached debugging context. These are not cosmetic: they
 * are the second half of the allow-list (ddl/core/feedback.ts is the first).
 * A field that can only hold `375x812` cannot be used to smuggle a contact name
 * into the table, whatever a modified client sends.
 */
export const FEEDBACK_ROUTE_MAX_LENGTH = 200;
export const FEEDBACK_USER_AGENT_MAX_LENGTH = 512;
export const FEEDBACK_VIEWPORT_PATTERN = /^\d{1,5}x\d{1,5}$/;
export const FEEDBACK_LOCALE_PATTERN = /^[A-Za-z0-9-]{2,35}$/;
export const FEEDBACK_TIMEZONE_PATTERN = /^[A-Za-z0-9_+/-]{1,64}$/;
export const FEEDBACK_APP_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
