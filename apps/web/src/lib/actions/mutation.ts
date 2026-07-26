import "server-only";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { isNextControlFlow } from "@/lib/actions/next-control-flow";

/**
 * Thrown from mutation() work to surface a SPECIFIC, user-meaningful message
 * (e.g. "Contact not found.") instead of the generic transient retry message.
 * A MutationError is treated as an expected validation/precondition outcome —
 * it is NOT logged as a bug and NOT classified transient.
 */
export class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationError";
  }
}

/** Discriminated result: either the work's value, or a user-facing error string. */
export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * The ONE path every DB-mutating server action goes through. It:
 *   1. resolves the current user (auth failures propagate — never masked as a save error),
 *   2. runs `work` inside a single scoped tenant connection (`withUserDb`) so a
 *      server action never fans out getDb() across the small tenant pool and
 *      never holds a connection across an LLM/fetch call, and
 *   3. turns a failure into a resilient RESULT instead of the full-page error
 *      boundary — keeping the caller mounted with the user's input intact.
 *
 * redirect()/notFound() control-flow throws are re-thrown so navigation still
 * fires. A MutationError becomes its own message; any other failure is logged
 * PII-safe (action name + error code/name + transient flag, never the message
 * body) and returned as the shared transient retry message.
 *
 * Compose the result with either action shape:
 *   - useActionState form:  return r.ok ? { notice } : { error: r.error }
 *   - optimistic (useOptimisticList/Toggle): return r.ok ? null : r.error
 */
export async function mutation<T>(
  name: string,
  work: (userId: string) => Promise<T>,
): Promise<MutationResult<T>> {
  const userId = await requireUserId();
  try {
    const data = await withUserDb(userId, () => work(userId));
    return { ok: true, data };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    if (error instanceof MutationError) return { ok: false, error: error.message };
    logActionError(name, error);
    return { ok: false, error: SAVE_RETRY_MESSAGE };
  }
}
