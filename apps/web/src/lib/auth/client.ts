import { createAuthClient } from "better-auth/react";
import { emailOTPClient, magicLinkClient, oneTapClient, phoneNumberClient, twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  plugins: [
    apiKeyClient(),
    passkeyClient(),
    twoFactorClient(),
    usernameClient(),
    magicLinkClient(),
    emailOTPClient(),
    phoneNumberClient(),
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
    }),
  ],
});
