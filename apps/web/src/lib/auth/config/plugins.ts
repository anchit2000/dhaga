import { nextCookies } from "better-auth/next-js";
// oneTap has no dedicated subpath export in better-auth 1.6 — root import is
// the only option for it.
import { oneTap } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins/email-otp";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { magicLink } from "better-auth/plugins/magic-link";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { twoFactor } from "better-auth/plugins/two-factor";
import { username } from "better-auth/plugins/username";
import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { sendSms } from "@/lib/sms/send";
import { sendMagicLinkEmail, sendOtpEmail } from "./emails";
import { googleSignInConfigured } from "./social";

/**
 * Every better-auth plugin the app runs. Always-on plugins need no external
 * credentials to exist (their endpoints fail loudly when a dependency like
 * email/SMS isn't configured); oneTap is the exception — it's meaningless
 * without a Google client id, so it's env-gated like the social providers.
 */
export function buildPlugins() {
  return [
    apiKey(),
    passkey(),
    twoFactor(),
    username(),
    haveIBeenPwned(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendOtpEmail(email, otp, type);
      },
    }),
    phoneNumber({
      sendOTP: async ({ phoneNumber: to, code }) => {
        const { ok, error } = await sendSms({ to, body: `Your Dhaga code: ${code}` });
        if (!ok) throw new Error(error ?? "SMS delivery failed.");
      },
    }),
    ...(googleSignInConfigured() ? [oneTap()] : []),
    // Docs: nextCookies must be the last plugin in the array.
    nextCookies(),
  ];
}
