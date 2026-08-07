"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanGateNotice } from "@/components/app/PlanGateNotice";
import { generateMessagingLinkTokenAction } from "@/lib/actions/messaging";
import { MessagingTokenCard, type ActiveToken } from "./TokenCard";

/**
 * "Connect this chat" interactivity: generate a link token (useTransition —
 * spinner + disabled while in-flight) and hand it to `MessagingTokenCard`. The
 * action revalidates Settings, so `activeToken` also refreshes from the server;
 * we prefer the just-returned token so it shows instantly. A transient failure
 * becomes a toast (matches the app's runAction/ActionForm idiom) instead of the
 * full-page error boundary.
 *
 * `linkGate` is the PRE-click half of the paid gate on linking a new chat; the
 * real refusal is `generateMessagingLinkTokenAction`'s own check, which returns
 * the same sentence, so the two can never disagree. A token minted before a
 * downgrade still renders — it is already live, and hiding it would leave the
 * user unable to finish a link they started.
 */
export function MessagingLinkPanel({
  activeToken,
  ttlMinutes,
  telegramBotUsername,
  whatsappNumber,
  linkGate,
}: {
  activeToken: ActiveToken | null;
  ttlMinutes: number;
  telegramBotUsername: string | null;
  whatsappNumber: string | null;
  /** Why a new chat can't be linked (plan), or null when it can. Chats already
   *  linked keep capturing and stay disconnectable either way. */
  linkGate: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<ActiveToken | null>(null);
  const token = generated ?? activeToken;

  function handleGenerate(): void {
    startTransition(async () => {
      const result = await generateMessagingLinkTokenAction();
      if (result.ok) setGenerated(result.data);
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {token ? (
        <MessagingTokenCard
          token={token}
          ttlMinutes={ttlMinutes}
          telegramBotUsername={telegramBotUsername}
          whatsappNumber={whatsappNumber}
        />
      ) : null}
      <PlanGateNotice reason={linkGate}>
        <Button
          type="button"
          variant={token ? "outline" : "default"}
          className="min-h-11"
          disabled={pending || linkGate !== null}
          onClick={handleGenerate}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {token ? "Regenerate token" : "Generate link token"}
        </Button>
      </PlanGateNotice>
    </div>
  );
}
