"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordFields } from "@/components/app/auth/PasswordFields";
import { MIN_PASSWORD_LENGTH } from "@/utils/constants/auth";

interface ChangePasswordProps {
  email: string;
}

/**
 * Change the sign-in password from inside the app. Uses better-auth's
 * changePassword (verifies the current password, then revokes other sessions).
 * Accounts created via social/OTP that have no password yet can't use this —
 * setPassword is server-only in this better-auth version, so the "email me a
 * reset link" affordance sends them through the same reset flow, which sets a
 * first password.
 */
export function ChangePassword({ email }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const passwordInvalid =
    newPassword.length < MIN_PASSWORD_LENGTH || newPassword !== confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    if (passwordInvalid) return;
    setPending(true);
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (changeError) {
      setError(changeError.message ?? "Couldn't change your password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password changed. Other sessions were signed out.");
  }

  async function handleSendReset(): Promise<void> {
    setSendingReset(true);
    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setSendingReset(false);
    if (resetError) {
      toast.error(resetError.message ?? "Couldn't send the reset email.");
      return;
    }
    toast.success("Check your email for a link to set a new password.");
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-paper">Password</p>
        <p className="mt-1 text-sm text-fog">Change the password you sign in with.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="current-password" className="text-fog">
            Current password
          </Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="h-10"
          />
        </div>
        <PasswordFields
          password={newPassword}
          confirmPassword={confirmPassword}
          onPasswordChange={setNewPassword}
          onConfirmChange={setConfirmPassword}
          passwordLabel="New password"
          confirmLabel="Confirm new password"
          inputClassName="h-10"
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending || !currentPassword || !newPassword || !confirmPassword || passwordInvalid}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Change password
        </Button>
      </form>
      <Button
        type="button"
        variant="link"
        onClick={handleSendReset}
        disabled={sendingReset}
        className="h-auto justify-start px-0 text-fog hover:text-paper"
      >
        {sendingReset ? "Sending…" : "Forgot or don't have a password? Email me a reset link"}
      </Button>
    </div>
  );
}
