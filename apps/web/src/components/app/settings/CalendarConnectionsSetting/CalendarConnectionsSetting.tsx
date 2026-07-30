"use client";

import { Button } from "@/components/ui/button";
import { CalendarConnectionRow } from "./CalendarConnectionRow";
import type { ReactElement } from "react";
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

/** Connect/disconnect calendars. Free/busy only by default; the full tier —
 *  event details, plus follow-ups written to a separate "Dhaga" calendar — is
 *  opt-in per connection and needs a second consent screen. */
export function CalendarConnectionsSetting({
  providers,
  connections,
  status,
}: {
  providers: CalendarProviderInfo[];
  connections: CalendarConnectionSummary[];
  status?: string;
}): ReactElement {
  const info = status ? STATUS[status] : undefined;
  const upgradable = new Set(
    providers.filter((provider) => provider.upgradable).map((provider) => provider.id),
  );
  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Calendars</h2>
        <p className="mt-1 text-sm text-fog">
          Connect a calendar so Dhaga can suggest open meeting times and flag overloaded days. By
          default we read only your busy times — never event details — and write nothing at all.
          Full access is opt-in per calendar: it lets Dhaga read event details, and it only ever
          writes to a separate calendar it creates, called &ldquo;Dhaga&rdquo;.
        </p>
      </div>

      {info ? (
        <p className={`text-xs ${info.ok ? "text-ember" : "text-destructive/90"}`}>{info.text}</p>
      ) : null}

      {connections.length > 0 ? (
        <ul className="space-y-2">
          {connections.map((connection) => (
            <CalendarConnectionRow
              key={connection.id}
              connection={connection}
              upgradable={upgradable.has(connection.provider)}
            />
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
