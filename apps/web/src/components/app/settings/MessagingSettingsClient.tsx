"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateMessagingLinkTokenAction,
  unlinkMessagingIdentityAction,
} from "@/lib/actions/messaging";

interface ActiveToken {
  token: string;
  expiresAt: string;
}

/**
 * "Connect this chat" interactivity: generate a link token (useTransition —
 * spinner + disabled while in-flight), display the freshly-minted token big +
 * monospace, and copy it to the clipboard. The action revalidates Settings, so
 * `activeToken` also refreshes from the server; we prefer the just-returned
 * token so it shows instantly. A transient failure becomes a toast (matches the
 * app's runAction/ActionForm idiom) instead of the full-page error boundary.
 */
export function MessagingLinkPanel({
  activeToken,
  ttlMinutes,
}: {
  activeToken: ActiveToken | null;
  ttlMinutes: number;
}) {
  const [pending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<ActiveToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(ttlMinutes);
  const token = generated ?? activeToken;

  // Show the real time remaining, not the full TTL, for a token minted earlier.
  // First render uses `ttlMinutes` so SSR and client agree (no hydration #418);
  // the real value is computed only inside timer callbacks (never synchronously
  // in the effect body — which would trip react-hooks/set-state-in-effect) and
  // then ticks down while the panel stays open.
  useEffect(() => {
    if (!token) return;
    const expiresAt = new Date(token.expiresAt).getTime();
    const update = (): void =>
      setMinutesLeft(Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000)));
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 30000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [token]);

  function handleGenerate(): void {
    startTransition(async () => {
      const result = await generateMessagingLinkTokenAction();
      if (result.ok) setGenerated(result.data);
      else toast.error(result.error);
    });
  }

  async function handleCopy(): Promise<void> {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      toast.success("Token copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the token and copy it manually.");
    }
  }

  return (
    <div className="space-y-3">
      {token ? (
        <div className="space-y-2 rounded-lg border border-amber/30 bg-amber/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <code className="overflow-x-auto font-mono text-2xl tracking-[0.2em] text-paper">
              {token.token}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0"
              onClick={handleCopy}
              aria-label="Copy link token"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-fog">
            Send this token to the bot to link this chat. Expires in {minutesLeft} min.
          </p>
        </div>
      ) : null}
      <Button
        type="button"
        variant={token ? "outline" : "default"}
        className="min-h-11"
        disabled={pending}
        onClick={handleGenerate}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {token ? "Regenerate token" : "Generate link token"}
      </Button>
    </div>
  );
}

/** Unlink one linked chat: confirm first (destructive, reversible only by
 *  re-linking), then run the action with a spinner and toast-on-failure. */
export function UnlinkButton({ identityId }: { identityId: string }) {
  const [pending, startTransition] = useTransition();

  function handleUnlink(): void {
    if (
      !confirm(
        "Unlink this chat? Messages from it won't be captured until you link it again.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await unlinkMessagingIdentityAction(identityId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-11 shrink-0 text-red-400/90 hover:bg-red-400/10 hover:text-red-400"
      disabled={pending}
      onClick={handleUnlink}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
      Unlink
    </Button>
  );
}
