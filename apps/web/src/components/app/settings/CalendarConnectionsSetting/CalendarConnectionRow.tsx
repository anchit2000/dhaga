"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Calendar, Loader2, X } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { disconnectCalendarAction, setCalendarWriteEnabledAction } from "@/lib/actions/calendar";
import type { ReactElement } from "react";
import type { CalendarConnectionSummary } from "@/lib/repo/calendar";

function DisconnectButton(): ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="icon-sm" disabled={pending} aria-label="Disconnect calendar">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </Button>
  );
}

/**
 * Write-out switch. The switch IS the submit control — the hidden `enabled`
 * field carries the value we are moving to, so the action never has to read the
 * switch itself. While in flight it shows the new position, disabled, so the row
 * never claims a state the server has not accepted yet.
 */
function WriteToggle({ enabled }: { enabled: boolean }): ReactElement {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex shrink-0 items-center gap-2">
      {pending ? <Loader2 className="size-3.5 animate-spin text-fog" /> : null}
      <Switch
        checked={pending ? !enabled : enabled}
        disabled={pending}
        inputRef={inputRef}
        onCheckedChange={(): void => inputRef.current?.form?.requestSubmit()}
        aria-label="Add follow-ups to my Dhaga calendar"
        // Widen the built-in hit area to a 44px-tall touch target.
        className="after:-inset-y-3.5"
      />
    </div>
  );
}

/** What this connection may actually do, read off the granted scope — never assumed. */
function tierLabel({ readEvents, writeEvents }: CalendarConnectionSummary["capabilities"]): string {
  if (!readEvents) return "Free/busy only";
  return writeEvents ? "Full access" : "Event details";
}

/** One connected calendar: what it can do, the opt-in upgrade, write-out, disconnect. */
export function CalendarConnectionRow({
  connection,
  upgradable,
}: {
  connection: CalendarConnectionSummary;
  upgradable: boolean;
}): ReactElement {
  const { capabilities } = connection;
  const canUpgrade = upgradable && !capabilities.readEvents;
  return (
    <li className="rounded-xl border border-seam bg-wash/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Calendar className="size-4 shrink-0 text-fog" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-paper">{connection.accountEmail ?? connection.provider}</p>
          <p className="text-xs text-fog">
            <span className="capitalize">{connection.provider}</span>
            {" · "}
            {capabilities.readEvents ? (
              <span className="text-ember">{tierLabel(capabilities)}</span>
            ) : (
              tierLabel(capabilities)
            )}
            {connection.status === "needs_reconnect" ? " · needs reconnect" : ""}
          </p>
        </div>
        <ActionForm
          action={disconnectCalendarAction}
          errorMessage="Couldn't disconnect that calendar — try again."
        >
          <input type="hidden" name="id" value={connection.id} />
          <DisconnectButton />
        </ActionForm>
      </div>

      {canUpgrade ? (
        <div className="mt-3 border-t border-seam pt-3">
          <p className="text-xs text-fog">
            Full access lets Dhaga read this calendar&apos;s event details and add follow-ups to a
            separate calendar it creates, called &ldquo;Dhaga&rdquo; — never your primary one. Leave
            it as it is and this connection keeps working exactly as it does now, busy times only.
          </p>
          <Button
            render={<a href={`/api/calendar/connect/${connection.provider}?upgrade=1`} />}
            variant="outline"
            size="sm"
            className="mt-2 min-h-11"
          >
            Upgrade to full access
          </Button>
        </div>
      ) : null}

      {capabilities.writeEvents ? (
        <ActionForm
          action={setCalendarWriteEnabledAction}
          errorMessage="Couldn't change calendar write-out — try again."
          className="mt-3 border-t border-seam pt-3"
        >
          <input type="hidden" name="id" value={connection.id} />
          <input type="hidden" name="enabled" value={String(!connection.writeEnabled)} />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-paper">Add follow-ups to my Dhaga calendar</p>
              <p className="mt-0.5 text-xs text-fog">
                Turn this off and Dhaga stops writing. The connection stays, and so does everything
                already on the Dhaga calendar — it&apos;s yours to keep, hide or delete.
              </p>
            </div>
            <WriteToggle enabled={connection.writeEnabled} />
          </div>
        </ActionForm>
      ) : null}
    </li>
  );
}
