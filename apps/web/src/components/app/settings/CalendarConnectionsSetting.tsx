"use client";

import { useFormStatus } from "react-dom";
import { Calendar, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disconnectCalendarAction } from "@/lib/actions/calendar";
import type { CalendarProviderInfo } from "@dhaga/core";
import type { CalendarConnectionSummary } from "@/lib/repo/calendar";

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Calendar connected." },
  error: { ok: false, text: "Couldn't connect — please try again." },
  bad_state: { ok: false, text: "That connection link expired — please try again." },
  exchange_failed: { ok: false, text: "Authorization failed — please try again." },
  not_configured: { ok: false, text: "That calendar isn't configured on this server." },
  unknown_provider: { ok: false, text: "Unknown calendar provider." },
};

function DisconnectButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="icon-sm" disabled={pending} aria-label="Disconnect calendar">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </Button>
  );
}

/** Connect/disconnect calendars. Read-only free/busy — we never write to a calendar. */
export function CalendarConnectionsSetting({
  providers,
  connections,
  status,
}: {
  providers: CalendarProviderInfo[];
  connections: CalendarConnectionSummary[];
  status?: string;
}) {
  const info = status ? STATUS[status] : undefined;
  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Calendars</h2>
        <p className="mt-1 text-sm text-fog">
          Connect a calendar so Dhaga can suggest open meeting times and flag overloaded days. We read
          only your busy times — never event details — and never write to your calendar.
        </p>
      </div>

      {info ? (
        <p className={`text-xs ${info.ok ? "text-amber" : "text-red-400/90"}`}>{info.text}</p>
      ) : null}

      {connections.length > 0 ? (
        <ul className="space-y-2">
          {connections.map((connection) => (
            <li
              key={connection.id}
              className="flex items-center gap-3 rounded-xl border border-seam bg-wash/[0.04] px-3 py-2.5"
            >
              <Calendar className="size-4 shrink-0 text-fog" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-paper">{connection.accountEmail ?? connection.provider}</p>
                <p className="text-xs capitalize text-fog">
                  {connection.provider}
                  {connection.status === "needs_reconnect" ? " · needs reconnect" : ""}
                </p>
              </div>
              <form action={disconnectCalendarAction}>
                <input type="hidden" name="id" value={connection.id} />
                <DisconnectButton />
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            render={<a href={`/api/calendar/connect/${provider.id}`} />}
            variant="outline"
            size="sm"
          >
            Connect {provider.label}
          </Button>
        ))}
        {providers.length === 0 ? (
          <p className="text-xs text-fog">No calendar providers are configured on this server yet.</p>
        ) : null}
      </div>
    </section>
  );
}
