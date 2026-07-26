/**
 * A repo-level failure caused by a user-facing PRECONDITION (an unusable or
 * duplicate name), not by infrastructure. Its `message` is hand-written and
 * safe to surface verbatim. Actions catch this to distinguish "show this exact
 * copy" from a real infra failure (which should take the generic retry path).
 */
export class PreconditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreconditionError";
  }
}
