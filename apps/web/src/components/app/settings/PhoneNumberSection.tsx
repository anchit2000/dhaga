"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PhoneNumberSection() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function sendCode(): Promise<void> {
    setPending(true);
    setError(undefined);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({ phoneNumber });
    setPending(false);
    if (sendError) {
      setError(sendError.message ?? "Couldn't send a code.");
      return;
    }
    setOtpSent(true);
  }

  async function verifyCode(): Promise<void> {
    setPending(true);
    setError(undefined);
    const { error: verifyError } = await authClient.phoneNumber.verify({ phoneNumber, code });
    setPending(false);
    if (verifyError) {
      setError(verifyError.message ?? "That code didn't match.");
      return;
    }
    setVerified(true);
  }

  if (verified) {
    return (
      <div className="space-y-1 border-t border-seam pt-4">
        <p className="text-sm text-paper">Phone number</p>
        <p className="text-sm text-fog">{phoneNumber} — verified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-seam pt-4">
      <p className="text-sm text-paper">Phone number</p>
      <p className="text-sm text-fog">Add a phone number to sign in with a one-time code.</p>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="phone" className="text-fog">
            Phone number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={otpSent}
            autoComplete="tel"
            className="h-10"
          />
        </div>
        {otpSent ? null : (
          <Button type="button" variant="outline" disabled={pending || !phoneNumber} onClick={sendCode}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send code
          </Button>
        )}
      </div>
      {otpSent ? (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="phone-code" className="text-fog">
              Code
            </Label>
            <Input
              id="phone-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              className="h-10"
            />
          </div>
          <Button type="button" disabled={pending || !code} onClick={verifyCode}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Verify
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
