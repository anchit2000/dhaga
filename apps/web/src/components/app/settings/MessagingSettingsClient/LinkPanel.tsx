"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMessagingLinkTokenAction } from "@/lib/actions/messaging";
import { messagingLinkUrl, MESSAGING_PROVIDER_LABELS } from "@/utils/constants/messaging";
import { MessagingLinkQr } from "../MessagingLinkQr";

/** How each channel's scan is described — what tapping/scanning will actually do. */
const SCAN_HINTS: Record<string, string> = {
  telegram: "Scan to open the bot — tap Start and you're linked.",
  whatsapp: "Scan to open a chat with the code ready — just hit send.",
};

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
  telegramBotUsername,
  whatsappNumber,
}: {
  activeToken: ActiveToken | null;
  ttlMinutes: number;
  telegramBotUsername: string | null;
  whatsappNumber: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<ActiveToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(ttlMinutes);
  const token = generated ?? activeToken;

  // Derived from the token in state, so a regenerate updates the codes in the
  // same render that updates the printed one — they can never disagree. A
  // channel with no configured handle yields no link and is simply not offered.
  const scanTargets = token
    ? (["telegram", "whatsapp"] as const)
        .map((provider) => ({
          label: MESSAGING_PROVIDER_LABELS[provider],
          hint: SCAN_HINTS[provider],
          url: messagingLinkUrl({
            provider,
            token: token.token,
            telegramBotUsername,
            whatsappNumber,
          }),
        }))
        .filter((target): target is { label: string; hint: string; url: string } =>
          Boolean(target.url),
        )
    : [];

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
          {scanTargets.length > 0 ? (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              {scanTargets.map((target) => (
                <MessagingLinkQr
                  key={target.label}
                  label={target.label}
                  url={target.url}
                  hint={target.hint}
                />
              ))}
            </div>
          ) : null}
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
