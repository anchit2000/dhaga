"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialButtons } from "@/components/app/auth/SocialButtons";
import { PasskeyButton } from "@/components/app/auth/PasskeyButton";
import { TwoFactorStep } from "@/components/app/auth/TwoFactorStep";
import type { SocialProviderOption } from "@/utils/constants/auth";

interface LoginFormProps {
  socialProviders: SocialProviderOption[];
}

export function LoginForm({ socialProviders }: LoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    setPending(true);
    setError(undefined);

    if (magicLinkMode) {
      const { error: linkError } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/app",
      });
      setPending(false);
      if (linkError) {
        setError(linkError.message ?? "Couldn't send the sign-in link.");
        return;
      }
      setMagicLinkSent(true);
      return;
    }

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password: String(formData.get("password") ?? ""),
    });
    if (signInError) {
      setPending(false);
      setError(signInError.message ?? "Wrong email or password.");
      return;
    }
    // The twoFactor plugin adds this at runtime via a response hook — not
    // part of the statically inferred sign-in response type.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setPending(false);
      setNeedsTwoFactor(true);
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  if (needsTwoFactor) return <TwoFactorStep />;

  if (magicLinkSent) {
    return (
      <p className="text-center text-sm text-fog">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-fog">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            className="h-11"
          />
        </div>
        {magicLinkMode ? null : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-fog">
                Password
              </Label>
              <Link href="/forgot-password" className="text-xs text-ember hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11"
            />
          </div>
        )}
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending
            ? magicLinkMode ? "Sending link…" : "Signing in…"
            : magicLinkMode ? "Email me a sign-in link" : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={() => setMagicLinkMode((v) => !v)}
          className="w-full text-center text-sm text-fog hover:underline"
        >
          {magicLinkMode ? "Use a password instead" : "Email me a sign-in link instead"}
        </button>
      </form>

      {socialProviders.length > 0 ? (
        <div className="flex items-center gap-3 text-xs text-fog">
          <span className="h-px flex-1 bg-seam" />
          or continue with
          <span className="h-px flex-1 bg-seam" />
        </div>
      ) : null}
      <SocialButtons providers={socialProviders} />
      <PasskeyButton />
    </div>
  );
}
