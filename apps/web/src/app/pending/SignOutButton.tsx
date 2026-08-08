"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/**
 * Sign-out for /pending. The app shell (and its ProfileMenu) is out of reach
 * for an unapproved account, so without this the only way off the screen is
 * clearing cookies by hand.
 */
export function SignOutButton(): ReactElement {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={signingOut}
      onClick={() => {
        if (signingOut) return;
        setSigningOut(true);
        void authClient.signOut().then(({ error }) => {
          if (error) {
            setSigningOut(false);
            return;
          }
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      Sign out
    </Button>
  );
}
