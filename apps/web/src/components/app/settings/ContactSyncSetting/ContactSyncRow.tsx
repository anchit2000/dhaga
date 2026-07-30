"use client";

import { useFormStatus } from "react-dom";
import { Contact, Loader2, X } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { Button } from "@/components/ui/button";
import { ContactSyncToggle } from "./ContactSyncToggle";
import {
  disconnectContactSyncAction,
  setContactPushUnlinkedAction,
  setContactSyncEnabledAction,
} from "@/lib/actions/contact-sync";
import type { ReactElement } from "react";
import type { ContactConnectionSummary } from "@/lib/repo/contact-sync";

function DisconnectButton(): ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label="Disconnect account"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </Button>
  );
}

function accessLabel({ read, write }: ContactConnectionSummary["capabilities"]): string {
  if (write) return "Two-way";
  return read ? "Read only" : "No access";
}

/** One connected address book: what it may do, its two switches, disconnect. */
export function ContactSyncRow({
  connection,
}: {
  connection: ContactConnectionSummary;
}): ReactElement {
  const { capabilities } = connection;
  return (
    <li className="rounded-xl border border-seam bg-wash/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Contact className="size-4 shrink-0 text-fog" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-paper">
            {connection.accountEmail ?? connection.provider}
          </p>
          <p className="text-xs text-fog">
            <span className="capitalize">{connection.provider}</span>
            {" · "}
            {capabilities.write ? (
              <span className="text-ember">{accessLabel(capabilities)}</span>
            ) : (
              accessLabel(capabilities)
            )}
            {connection.status === "needs_reconnect" ? " · needs reconnect" : ""}
            {connection.lastSyncedAt
              ? ` · last synced ${connection.lastSyncedAt.toLocaleDateString()}`
              : " · never synced"}
          </p>
        </div>
        <ActionForm
          action={disconnectContactSyncAction}
          errorMessage="Couldn't disconnect that account — try again."
        >
          <input type="hidden" name="id" value={connection.id} />
          <DisconnectButton />
        </ActionForm>
      </div>

      {capabilities.write ? (
        <>
          <ActionForm
            action={setContactSyncEnabledAction}
            errorMessage="Couldn't change syncing — try again."
            className="mt-3 border-t border-seam pt-3"
          >
            <input type="hidden" name="id" value={connection.id} />
            <input type="hidden" name="enabled" value={String(!connection.syncEnabled)} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-paper">Keep this account in step</p>
                <p className="mt-0.5 text-xs text-fog">
                  Turn this off and Dhaga stops syncing. The connection stays, and so does everything
                  already in your address book.
                </p>
              </div>
              <ContactSyncToggle
                enabled={connection.syncEnabled}
                label="Keep this account in step"
              />
            </div>
          </ActionForm>

          <ActionForm
            action={setContactPushUnlinkedAction}
            errorMessage="Couldn't change that setting — try again."
            className="mt-3 border-t border-seam pt-3"
          >
            <input type="hidden" name="id" value={connection.id} />
            <input type="hidden" name="enabled" value={String(!connection.pushUnlinked)} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-paper">Add Dhaga-only people to this account</p>
                <p className="mt-0.5 text-xs text-fog">
                  Off by default. Turn it on and people who exist only in Dhaga — scanned cards,
                  contacts you added here — are copied into this account too. People Dhaga only
                  heard mentioned in a note are never copied.
                </p>
              </div>
              <ContactSyncToggle
                enabled={connection.pushUnlinked}
                label="Add Dhaga-only people to this account"
              />
            </div>
          </ActionForm>
        </>
      ) : null}
    </li>
  );
}
