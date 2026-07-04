"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialButtons } from "@/components/app/auth/SocialButtons";
import type { SocialProviderOption } from "@/utils/constants/auth";

interface SignupFormProps {
  socialProviders: SocialProviderOption[];
  defaultEmail?: string;
}

export function SignupForm({ socialProviders, defaultEmail }: SignupFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [requested, setRequested] = useState<string | undefined>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    const { error: signUpError } = await authClient.signUp.email({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    setPending(false);
    if (signUpError) {
      // Signup gate blocks unapproved emails with a 403 and files an access
      // request automatically — see lib/auth/config/index.ts. Show that as
      // a next step, not a failure.
      if (signUpError.status === 403) {
        setRequested(signUpError.message ?? "We've sent your access request — check your email.");
        return;
      }
      setError(signUpError.message ?? "Couldn't create your account.");
      return;
    }
    router.push("/app/people");
  }

  if (requested) {
    return <p className="text-center text-sm text-fog">{requested}</p>;
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
        <div className="space-y-2">
          <Label htmlFor="password" className="text-fog">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>

      {socialProviders.length > 0 ? (
        <div className="flex items-center gap-3 text-xs text-fog">
          <span className="h-px flex-1 bg-seam" />
          or continue with
          <span className="h-px flex-1 bg-seam" />
        </div>
      ) : null}
      <SocialButtons providers={socialProviders} />
    </div>
  );
}
