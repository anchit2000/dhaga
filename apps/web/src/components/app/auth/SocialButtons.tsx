"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import type { SocialProviderOption } from "@/utils/constants/auth";

interface SocialButtonsProps {
  providers: SocialProviderOption[];
}

/** One button per server-enabled provider — see lib/auth/config/social.ts. */
export function SocialButtons({ providers }: SocialButtonsProps) {
  const [pendingId, setPendingId] = useState<string | undefined>();

  if (providers.length === 0) return null;

  async function signInWith(id: SocialProviderOption["id"]): Promise<void> {
    setPendingId(id);
    const { error } = await authClient.signIn.social({
      provider: id,
      callbackURL: "/app",
      errorCallbackURL: "/auth/error",
    });
    if (error) setPendingId(undefined);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {providers.map(({ id, label }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          disabled={pendingId !== undefined}
          onClick={() => signInWith(id)}
          className="h-10"
        >
          {pendingId === id ? <Loader2 className="size-4 animate-spin" /> : null}
          {pendingId === id ? `Connecting to ${label}…` : label}
        </Button>
      ))}
    </div>
  );
}
