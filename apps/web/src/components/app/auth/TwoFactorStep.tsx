"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shown after signIn.email/username/passkey returns twoFactorRedirect. */
export function TwoFactorStep() {
  const router = useRouter();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    setPending(true);
    setError(undefined);
    const { error: verifyError } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    if (verifyError) {
      setError(verifyError.message ?? "Invalid code.");
      setPending(false);
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code" className="text-fog">
          {useBackupCode ? "Backup code" : "Authenticator code"}
        </Label>
        <Input
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
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
        Verify
      </Button>
      <button
        type="button"
        onClick={() => setUseBackupCode((v) => !v)}
        className="w-full text-center text-sm text-fog hover:underline"
      >
        {useBackupCode ? "Use an authenticator code instead" : "Use a backup code instead"}
      </button>
    </form>
  );
}
