interface SignupNoticeProps {
  requested?: string;
  verificationSent: boolean;
  magicLinkSent: boolean;
}

/**
 * The three post-submit states of the signup form — access requested,
 * email-verification sent, and magic-link sent — all render the same muted
 * two-line status block. Factored out so the copy lives in one place and
 * SignupForm stays under the 150-line rule. Returns null when none applies.
 */
export function SignupNotice({ requested, verificationSent, magicLinkSent }: SignupNoticeProps) {
  const lines = requested
    ? [requested, "There is no account yet. Once approved, use the link in the email to finish signup."]
    : verificationSent
      ? ["Check your inbox to verify your email.", "Your account will be ready after you open the verification link."]
      : magicLinkSent
        ? ["Check your email for a sign-in link.", "If your email is approved, the link will finish creating your account."]
        : null;
  if (!lines) return null;
  return (
    <div className="space-y-3 text-center text-sm text-fog" role="status">
      <p>{lines[0]}</p>
      <p>{lines[1]}</p>
    </div>
  );
}
