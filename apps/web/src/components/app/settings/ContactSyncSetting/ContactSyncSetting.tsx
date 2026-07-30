"use client";

import { useFormStatus } from "react-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { Button } from "@/components/ui/button";
import { ContactSyncRow } from "./ContactSyncRow";
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

function SyncNowButton(): ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending} className="min-h-11">
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
  status,
}: {
  providers: ContactSyncProviderInfo[];
  connections: ContactConnectionSummary[];
  status?: string;
}): ReactElement {
  const info = status ? STATUS[status] : undefined;
  const configured = providers.filter((provider) => provider.configured);
  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
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
        {connections.length > 0 ? (
          <ActionForm
            action={runContactSyncAction}
            errorMessage="Sync couldn't finish — try again."
          >
            <SyncNowButton />
          </ActionForm>
        ) : null}
        {configured.length === 0 ? (
          <p className="text-xs text-fog">
            No contacts providers are configured on this server yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
