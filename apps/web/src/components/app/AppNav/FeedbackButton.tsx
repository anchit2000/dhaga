"use client";

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useParams, usePathname } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/app/feedback/toast";
import { describeAttached, routePattern, type FeedbackContext } from "@/lib/feedback/context";
import { FEEDBACK_MAX_LENGTH } from "@/utils/constants/feedback";

/** Browser-only half of the context. Read on open so a resize is reflected. */
type Environment = Omit<FeedbackContext, "route">;

/**
 * Always-visible feedback affordance, in the app nav beside the notification
 * bell rather than as a new floating button. Two reasons: the sticky header is
 * the only chrome present on EVERY /app route (the capture dock renders on Home
 * and /app/quick-add only), and a fixed bottom-corner button would sit in the
 * band the dock and the bottom-right toaster already occupy at 375px.
 *
 * One free-text field, no categories or tagging — routing a handful of reports
 * by reading them is cheaper than making every user classify their own.
 */
export function FeedbackButton(): ReactElement {
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [environment, setEnvironment] = useState<Environment | null>(null);

  const route = useMemo(() => routePattern(pathname, params), [pathname, params]);

  /**
   * Browser globals are read HERE, in the open handler, not in an effect: it
   * keeps the reads off the server render, refreshes the viewport every time
   * the box is opened (a resize between opens would otherwise be reported
   * stale), and avoids the cascading render setState-in-effect would cause.
   */
  function handleOpenChange(next: boolean): void {
    if (next) {
      setEnvironment({
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        appVersion: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      });
    }
    setOpen(next);
  }

  const context: FeedbackContext = { route, ...environment };

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, ...context }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setMessage("");
      setOpen(false);
      toastSuccess("Thanks — that's on its way.");
    } catch {
      toastError("Couldn't send that. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-full text-fog hover:text-paper"
          />
        }
      >
        <MessageSquarePlus className="size-5" />
        <span className="sr-only">Send feedback</span>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Send feedback</DialogTitle>
        <DialogDescription>
          Something broken, something missing, or something that could be better — it all
          lands in the same place.
        </DialogDescription>
        <form onSubmit={submit} className="grid gap-3">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={FEEDBACK_MAX_LENGTH}
            required
            rows={5}
            className="min-h-32"
            placeholder="What's on your mind?"
            aria-label="Your feedback"
          />
          {/* Silent collection is the thing the product's privacy stance
              forbids, so the attachment is spelled out BEFORE sending. */}
          <p className="text-xs leading-relaxed text-fog">
            {describeAttached(context)} Never your contacts, notes or searches.
          </p>
          <Button type="submit" disabled={pending || !message.trim()} className="h-11 w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
