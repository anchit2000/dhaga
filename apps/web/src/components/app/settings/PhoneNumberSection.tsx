"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComingSoonNotice } from "@/components/app/ComingSoonNotice";
import {
  PHONE_SIGN_IN_COMING_SOON,
  PHONE_SIGN_IN_UNBUILT_COMING_SOON,
} from "@/utils/constants/coming-soon";

/**
 * Gated in BETA, and unconditionally so: nothing in the app signs a user in
 * with a phone code (email, magic link, passkey and social are the ways in), so
 * verifying a number here is a dead end whatever the provider config says.
 * `smsEnabled` — the live `smsEnabled()` result threaded from the server, never
 * a literal — therefore selects the WORDING rather than the gate, so an
 * instance with Twilio configured isn't told SMS is missing. Delete the gate,
 * not this component, when a phone sign-in path actually exists.
 */
export function PhoneNumberSection({ smsEnabled }: { smsEnabled: boolean }) {
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

  // Never null today (see the note above). Typed nullable anyway so lifting the
  // gate once phone sign-in exists is one line here, not a rewrite of every
  // `disabled` below.
  const gate: string | null = smsEnabled
    ? PHONE_SIGN_IN_UNBUILT_COMING_SOON
    : PHONE_SIGN_IN_COMING_SOON;

  return (
    <div className="space-y-3 border-t border-seam pt-4">
      <p className="text-sm text-paper">Phone number</p>
      <p className="text-sm text-fog">Add a phone number to sign in with a one-time code.</p>
      {/* Heading and description stay outside the notice so the section is still
          readable; only the controls are dimmed, with the reason directly under
          them (ComingSoonNotice owns hover, focus and the visible pill). */}
      <ComingSoonNotice reason={gate}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor="phone" className="text-fog">
                Phone number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={otpSent || gate !== null}
                autoComplete="tel"
                className="h-10"
              />
            </div>
            {otpSent ? null : (
              <Button
                type="button"
                variant="outline"
                disabled={pending || !phoneNumber || gate !== null}
                onClick={sendCode}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Send code
              </Button>
            )}
          </div>
          {otpSent ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1 space-y-1">
                <Label htmlFor="phone-code" className="text-fog">
                  Code
                </Label>
                <Input
                  id="phone-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={gate !== null}
                  autoComplete="one-time-code"
                  className="h-10"
                />
              </div>
              <Button type="button" disabled={pending || !code || gate !== null} onClick={verifyCode}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify
              </Button>
            </div>
          ) : null}
        </div>
      </ComingSoonNotice>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
