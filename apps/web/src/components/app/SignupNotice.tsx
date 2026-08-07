interface SignupNoticeProps {
  verificationSent: boolean;
  magicLinkSent: boolean;
}

/**
 * The two post-submit states of the signup form — email-verification sent and
 * magic-link sent — render the same muted two-line status block. Factored out
 * so the copy lives in one place and SignupForm stays under the 150-line rule.
 * Returns null when neither applies.
 *
 * There is no "access requested" state any more: signup is open, and the
 * hosted waiting list is something the account sits on at /pending after it
 * exists, not a wall in front of creating it.
 */
export function SignupNotice({ verificationSent, magicLinkSent }: SignupNoticeProps) {
  const lines = verificationSent
    ? ["Check your inbox to verify your email.", "Your account will be ready after you open the verification link."]
    : magicLinkSent
      ? ["Check your email for a sign-in link.", "Opening the link finishes creating your account."]
      : null;
  if (!lines) return null;
  return (
    <div className="space-y-3 text-center text-sm text-fog" role="status">
      <p>{lines[0]}</p>
      <p>{lines[1]}</p>
    </div>
  );
}
