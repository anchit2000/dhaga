/**
 * Next.js signals redirect() / notFound() by THROWING a control-flow error with
 * a `NEXT_*` digest. Any resilience/mutation wrapper that catches errors must
 * re-throw these so the navigation still happens — only a real failure becomes a
 * toast or a returned error. Kept in its own dependency-free module so both the
 * client resilience helpers (ActionForm) and the server mutation() wrapper can
 * import it without dragging server-only code into the client bundle.
 */
export function isNextControlFlow(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}
