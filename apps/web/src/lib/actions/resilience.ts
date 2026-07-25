/**
 * Shared resilience helpers for server actions. A transient DB/connection
 * failure (a momentary pool saturation the connect-retry couldn't ride out, a
 * dropped socket mid-query) must never dump the user into the full-page error
 * boundary or throw away what they just typed. Actions that back a form
 * (useActionState) catch the write and return this message instead of throwing,
 * so the client component stays mounted with the user's unsaved input intact.
 */

import { isTransientConnectionError } from "@/utils/constants/db";

/** User-facing copy for a transient save failure — reassures that input is kept. */
export const SAVE_RETRY_MESSAGE =
  "Something interrupted the save — your details are still here. Please try again.";

/**
 * Log a mutation failure to server logs WITHOUT contact PII (privacy rule: never
 * log contact names, note text, or extraction output). Records only the action
 * name, the error's `code`/`name`, and a `transient` flag — never the message
 * body (a constraint violation can echo a conflicting value).
 *
 * `transient` classifies the error with the same PII-safe predicate the pools
 * retry on (`isTransientConnectionError`: fixed `code`/message checks only): true
 * means a pool connect-timeout / session-pool rejection that a retry rides out —
 * infra, not a bug. Without it a connect-timeout and any other bare `Error` both
 * log as `{ code: undefined, name: 'Error' }`, indistinguishable; the flag is
 * what makes "transient blip" vs "real bug" decidable from the log line alone.
 */
export function logActionError(action: string, error: unknown): void {
  const code = (error as { code?: unknown } | null)?.code;
  const name = error instanceof Error ? error.name : typeof error;
  const transient = isTransientConnectionError(error);
  console.error(`[action:${action}] failed`, { code, name, transient });
}
