"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { runAction } from "@/components/app/ActionForm";
import { Button } from "@/components/ui/button";
import { ContactSyncRow } from "./ContactSyncRow";
import { SeedDownload } from "./SeedDownload";
import { runContactSyncAction } from "@/lib/actions/contact-sync";
import type { ReactElement } from "react";
import type { ContactSyncProviderInfo } from "@dhaga/core";
import type { ContactConnectionSummary } from "@/lib/repo/contact-sync";

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Account connected." },
  cancelled: { ok: false, text: "Connection cancelled." },
  failed: { ok: false, text: "Couldn't connect — please try again." },
  bad_state: { ok: false, text: "That connection link expired — please try again." },
  not_configured: { ok: false, text: "That provider isn't configured on this server." },
  unknown_provider: { ok: false, text: "Unknown contacts provider." },
};

function SyncNowButton({ pending, onRun }: { pending: boolean; onRun: () => void }): ReactElement {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={onRun}
      className="min-h-11"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RefreshCw className="size-3.5" />
      )}
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}

/**
 * Connect Google or Outlook contacts so Dhaga can keep them in step from the
 * server — no phone required. This is the path that reaches an Android user's
 * Google account, which the on-device sync cannot do for contacts Dhaga creates.
 */
export function ContactSyncSetting({
  providers,
  connections,
  authoredCount,
  status,
}: {
  providers: ContactSyncProviderInfo[];
  connections: ContactConnectionSummary[];
  /** Contacts a bulk seed would contain — decides whether to offer one at all. */
  authoredCount: number;
  status?: string;
}): ReactElement {
  const info = status ? STATUS[status] : undefined;
  const configured = providers.filter((provider) => provider.configured);
  const [pending, startTransition] = useTransition();
  // Held here rather than on the server-rendered rows below because it is true
  // of the RUN, not of the connection: nothing is stored, and the next run
  // answers again from scratch.
  const [remaining, setRemaining] = useState(0);

  const run = (): void => {
    startTransition(async () => {
      let left = 0;
      const ok = await runAction(async () => {
        left = await runContactSyncAction();
      }, "Sync couldn't finish — try again.");
      setRemaining(ok ? left : 0);
    });
  };
  // `data-tour` anchors the onboarding tour's settings leg, which stops here to
  // say the outward direction exists and is off. The whole CARD is the anchor,
  // not the switch: the switch only renders once a write-capable account is
  // connected, and on a first run there is none.
  return (
    <section
      data-tour="contact-sync"
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6"
    >
      <div>
        <h2 className="font-display text-lg">Contact accounts</h2>
        <p className="mt-1 text-sm text-fog">
          Connect Google or Outlook and Dhaga keeps those contacts and your graph in step, both
          ways — without needing your phone. Only the address-book fields cross: your notes, the
          facts Dhaga extracted and your relationships are never written to an account. Syncing runs
          when you ask it to, never in the background.
        </p>
      </div>

      {info ? (
        <p className={`text-xs ${info.ok ? "text-ember" : "text-destructive/90"}`}>{info.text}</p>
      ) : null}

      {connections.length > 0 ? (
        <ul className="space-y-2">
          {connections.map((connection) => (
            <ContactSyncRow key={connection.id} connection={connection} />
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {configured.map((provider) => (
          <Button
            key={provider.id}
            render={<a href={`/api/contact-sync/connect/${provider.id}`} />}
            variant="outline"
            size="sm"
            className="min-h-11"
          >
            Connect {provider.label}
          </Button>
        ))}
        {connections.length > 0 ? <SyncNowButton pending={pending} onRun={run} /> : null}
        {configured.length === 0 ? (
          <p className="text-xs text-fog">
            No contacts providers are configured on this server yet.
          </p>
        ) : null}
      </div>

      {/* One run copies only so many across, and saying nothing about the rest
          is how a half-filled account passes for a finished one. */}
      {remaining > 0 ? (
        <p className="text-xs text-ember">
          {remaining} contact{remaining === 1 ? "" : "s"} still to add — sync again to continue.
        </p>
      ) : null}

      {/* Deliberately NOT gated on `remaining`. The remainder is a top-up for an
          account already syncing; this is the first-time seed, and the user who
          needs it most — someone syncing a phone on-device — has no connection
          row here at all, so nothing about a run would ever surface it. It
          renders whenever there is something to seed, which is why the count
          comes from the server rather than from a run. */}
      <SeedDownload
        authoredCount={authoredCount}
        connections={connections}
        providers={providers}
        remaining={remaining}
      />
    </section>
  );
}
