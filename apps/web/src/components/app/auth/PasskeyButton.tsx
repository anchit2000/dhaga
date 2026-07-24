"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { PASSKEY_CANCELLED_CODES } from "@/utils/constants/auth";

export function PasskeyButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  async function handleClick(): Promise<void> {
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const { error: signInError } = await authClient.signIn.passkey();
    if (signInError) {
      setPending(false);
      // "No passkey exists" and "user dismissed the prompt" are indistinguishable
      // at the WebAuthn layer (both come back cancelled). Neither is a failure —
      // guide the user to another method instead of a red error.
      if ("code" in signInError && (PASSKEY_CANCELLED_CODES as readonly string[]).includes(signInError.code)) {
        setNotice("No passkey found on this device. Use your email or a sign-in link instead.");
        return;
      }
      setError(signInError.message ?? "Passkey sign-in failed.");
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={handleClick}
        className="h-10 w-full"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Continue with a passkey
      </Button>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-fog" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
