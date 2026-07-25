"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/app/auth/PasswordStrengthMeter";
import { MIN_PASSWORD_LENGTH } from "@/utils/constants/auth";

interface PasswordFieldsProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  passwordLabel?: string;
  confirmLabel?: string;
  passwordId?: string;
  confirmId?: string;
  autoFocus?: boolean;
  /** Input height class — h-11 on the standalone auth pages, h-10 inside settings. */
  inputClassName?: string;
}

/**
 * Shared new-password + confirm-password pair: strength meter under the first
 * field, inline mismatch under the second. The single implementation behind the
 * reset, signup, and in-app change-password surfaces. Controlled — the parent
 * owns the values (and gates submit); this component owns the feedback UI.
 */
export function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  passwordLabel = "New password",
  confirmLabel = "Confirm password",
  passwordId = "new-password",
  confirmId = "confirm-password",
  autoFocus = false,
  inputClassName = "h-11",
}: PasswordFieldsProps) {
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-fog">
          {passwordLabel}
        </Label>
        <Input
          id={passwordId}
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoFocus={autoFocus}
          autoComplete="new-password"
          className={inputClassName}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        <PasswordStrengthMeter password={password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={confirmId} className="text-fog">
          {confirmLabel}
        </Label>
        <Input
          id={confirmId}
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          aria-invalid={mismatch}
          className={inputClassName}
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
        />
        {mismatch ? (
          <p className="text-sm text-red-400" role="alert">
            Passwords don&apos;t match.
          </p>
        ) : null}
      </div>
    </div>
  );
}
