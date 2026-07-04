"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasskeySection } from "./PasskeySection";
import { PhoneNumberSection } from "./PhoneNumberSection";

interface SecuritySettingProps {
  twoFactorEnabled: boolean;
}

/** 2FA, passkeys, and phone verification — all optional, all self-serve. */
export function SecuritySetting({ twoFactorEnabled: initialEnabled }: SecuritySettingProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | undefined>();

  async function handleEnable(): Promise<void> {
    setPending(true);
    setError(undefined);
    const { data, error: enableError } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (enableError || !data) {
      setError(enableError?.message ?? "Couldn't enable two-factor.");
      return;
    }
    setSetup(data);
    setEnabled(true);
    setPassword("");
  }

  async function handleDisable(): Promise<void> {
    setPending(true);
    setError(undefined);
    const { error: disableError } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (disableError) {
      setError(disableError.message ?? "Couldn't disable two-factor.");
      return;
    }
    setEnabled(false);
    setSetup(undefined);
    setPassword("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-paper">
            {enabled ? (
              <ShieldCheck className="size-4 text-amber" />
            ) : (
              <ShieldOff className="size-4 text-fog" />
            )}
            Two-factor authentication is {enabled ? "on" : "off"}
          </div>
          {setup ? (
            <div className="space-y-2 rounded-lg border border-seam bg-ink p-3 text-sm">
              <p className="text-fog">
                Scan this in your authenticator app (or paste it as a setup URI):
              </p>
              <code className="block break-all text-xs text-paper">{setup.totpURI}</code>
              <p className="text-fog">Save these backup codes somewhere safe:</p>
              <code className="block text-xs text-paper">{setup.backupCodes.join("  ")}</code>
            </div>
          ) : null}
          {!enabled || setup ? null : (
            <p className="text-sm text-fog">
              Signing in will ask for a code from your authenticator app.
            </p>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="tfa-password" className="text-fog">
                Confirm your password
              </Label>
              <Input
                id="tfa-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10"
              />
            </div>
            <Button
              type="button"
              variant={enabled ? "outline" : "default"}
              disabled={pending || !password}
              onClick={enabled ? handleDisable : handleEnable}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {enabled ? "Disable" : "Enable"}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <PasskeySection />
        <PhoneNumberSection />
      </CardContent>
    </Card>
  );
}
