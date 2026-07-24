/** The "or continue with" divider shown above the social sign-in buttons on
 * the login and signup forms. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-fog">
      <span className="h-px flex-1 bg-seam" />
      or continue with
      <span className="h-px flex-1 bg-seam" />
    </div>
  );
}
