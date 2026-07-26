"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { PasswordFields } from "@/components/app/auth/PasswordFields";
import { MIN_PASSWORD_LENGTH } from "@/utils/constants/auth";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const invalid = newPassword.length < MIN_PASSWORD_LENGTH || newPassword !== confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (invalid) return;
    setPending(true);
    setError(undefined);
    const { error: resetError } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (resetError) {
      setError(resetError.message ?? "That reset link is invalid or expired.");
      return;
    }
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordFields
        password={newPassword}
        confirmPassword={confirmPassword}
        onPasswordChange={setNewPassword}
        onConfirmChange={setConfirmPassword}
        confirmLabel="Confirm new password"
        autoFocus
      />
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || invalid} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Set new password
      </Button>
    </form>
  );
}
