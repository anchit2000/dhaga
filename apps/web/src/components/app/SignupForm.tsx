"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
    if (signUpError) {
      setError(signUpError.message ?? "Couldn't create your account.");
      setPending(false);
      return;
    }
    router.push("/app/people");
  }

  return (
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
  );
}
