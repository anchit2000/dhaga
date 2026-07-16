/** Uniform server-action result: the touched row's `id` on success, a
 *  user-facing `error` otherwise. Extend via intersection for extra fields. */
export interface ActionResult {
  id?: string;
  error?: string;
}
