"use client";

import { useActionState } from "react";
import { emailDigestAction, type DigestState } from "@/lib/actions/events";
import { SubmitButton } from "./SubmitButton";

/** v1.2 post-event digest — user-triggered, template-based, zero AI cost. */
export function EmailDigestButton({ eventId }: { eventId: string }) {
  const [state, formAction] = useActionState<DigestState, FormData>(
    emailDigestAction,
    {},
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <SubmitButton className="h-9 px-4 text-sm">Email me the digest</SubmitButton>
      </form>
      {state.sent ? (
        <p className="text-xs text-amber/90" role="status">
          Sent — check your inbox.
        </p>
      ) : null}
      {state.error ? (
        <p className="text-xs text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
