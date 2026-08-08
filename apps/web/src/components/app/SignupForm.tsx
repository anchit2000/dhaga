"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialButtons } from "@/components/app/auth/SocialButtons";
import { AuthDivider } from "@/components/app/auth/AuthDivider";
import { PasswordFields } from "@/components/app/auth/PasswordFields";
import { SignupNotice } from "@/components/app/SignupNotice";
import { MIN_PASSWORD_LENGTH, type SocialProviderOption } from "@/utils/constants/auth";

interface SignupFormProps {
  socialProviders: SocialProviderOption[];
  defaultEmail?: string;
}

export function SignupForm({ socialProviders, defaultEmail }: SignupFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [verificationSent, setVerificationSent] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const passwordInvalid = password.length < MIN_PASSWORD_LENGTH || password !== confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    if (!magicLinkMode && passwordInvalid) return;
    setPending(true);
    setError(undefined);

    if (magicLinkMode) {
      // In magic-link mode the account is only created when the user clicks the
      // link, so don't claim the account exists yet. `/app` is the right
      // callback either way: an account still waiting for approval is redirected
      // from there to /pending by the auth guard.
      const { error: linkError } = await authClient.signIn.magicLink({ email, name, callbackURL: "/app" });
      setPending(false);
      if (linkError) {
        setError(linkError.message ?? "Couldn't send the sign-in link.");
        return;
      }
      setMagicLinkSent(true);
      return;
    }

    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (signUpError) {
      // Signup is open now — the only 403 left is the AGPL core's single-user
      // guard (lib/auth/config/signup-hooks.ts), which IS a failure and whose
      // message explains itself. The hosted waiting list happens after the
      // account exists, on /pending.
      setError(signUpError.message ?? "Couldn't create your account.");
      return;
    }
    setVerificationSent(true);
    router.refresh();
  }

  if (verificationSent || magicLinkSent) {
    return <SignupNotice verificationSent={verificationSent} magicLinkSent={magicLinkSent} />;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-fog">
            Name
          </Label>
          <Input id="name" name="name" required autoFocus autoComplete="name" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-fog">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            autoComplete="email"
            className="h-11"
          />
        </div>
        {magicLinkMode ? null : (
          <PasswordFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            passwordLabel="Password"
            passwordId="password"
            confirmId="confirm-password"
          />
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending || (!magicLinkMode && passwordInvalid)}
          className="w-full"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {magicLinkMode
            ? pending ? "Sending link…" : "Email me a sign-in link"
            : "Create account"}
        </Button>
        <button
          type="button"
          onClick={() => setMagicLinkMode((v) => !v)}
          className="w-full text-center text-sm text-fog hover:underline"
        >
          {magicLinkMode ? "Use a password instead" : "Email me a sign-in link instead"}
        </button>
      </form>

      {socialProviders.length > 0 ? <AuthDivider /> : null}
      <SocialButtons providers={socialProviders} />
    </div>
  );
}
