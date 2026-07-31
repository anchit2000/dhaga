"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactElement } from "react";
import type { ContactSyncProviderInfo } from "@dhaga/core";
import type { ContactConnectionSummary } from "@/lib/repo/contact-sync";

/**
 * Everyone the user has added in Dhaga, as one .vcf. `scope=authored` is the
 * same predicate the push filters on (@/lib/repo/sync/authored), so this file
 * can never contain what a sync would refuse to write outward.
 *
 * No `provider`: a fresh address book has nothing linked yet, so the filter
 * would subtract nothing — and naming a provider would imply the file belongs
 * to that account when it is equally importable into a phone, a laptop, or
 * anything that reads vCard.
 */
const SEED_ALL_HREF = "/api/export/vcard?scope=authored";

/**
 * The same file narrowed to one account: whoever it is still missing. Derived
 * from SEED_ALL_HREF so the two links cannot drift apart. The provider comes
 * from the connection being rendered, never from the user — a picker here could
 * only ever be a way to get it wrong.
 */
function seedHref(provider: string): string {
  return `${SEED_ALL_HREF}&provider=${encodeURIComponent(provider)}`;
}

/**
 * Accounts the push is currently offering Dhaga-only contacts to — the three
 * conditions runContactSync itself runs on (connected, syncing, write granted)
 * plus the opt-in that decides whether Dhaga-only people go there at all.
 *
 * `pushUnlinked` is the load-bearing one. Handing the user a file of every
 * Dhaga-only person to import into an account they explicitly told Dhaga not to
 * copy them into would route around that switch rather than honour it, and the
 * user would have done it believing Dhaga had vetted the file.
 */
function seedTargets(connections: ContactConnectionSummary[]): ContactConnectionSummary[] {
  return connections.filter(
    (connection) =>
      connection.status === "connected" &&
      connection.syncEnabled &&
      connection.capabilities.write &&
      connection.pushUnlinked,
  );
}

/**
 * Bulk-seeding an address book: two jobs sharing one file and one explanation.
 *
 * Seeding FROM SCRATCH is the always-on one, and it is the only path that
 * reaches a phone — on-device sync has no connection row here, so nothing about
 * a run would ever reveal it. Gated on there being something to seed at all,
 * because a download that hands back an empty file is worse than no link.
 *
 * Topping up the REMAINDER is the conditional one, offered per account only
 * once a run has reported one. It sits under the same heading rather than in
 * its own panel because it is the same file with the already-synced people
 * removed, and stating that idea twice would read as two features.
 */
export function SeedDownload({
  authoredCount,
  connections,
  providers,
  remaining,
}: {
  authoredCount: number;
  connections: ContactConnectionSummary[];
  providers: ContactSyncProviderInfo[];
  remaining: number;
}): ReactElement | null {
  if (authoredCount < 1) return null;
  const targets = remaining > 0 ? seedTargets(connections) : [];
  const labelFor = (provider: string): string =>
    providers.find((entry) => entry.id === provider)?.label ?? provider;

  return (
    <div className="space-y-2.5 rounded-xl border border-seam bg-wash/[0.04] p-3">
      <div>
        <p className="text-sm text-paper">Seed an address book in one go</p>
        <p className="mt-0.5 text-xs text-fog">
          Download everyone you have added in Dhaga as a single contacts file, then import it into
          your phone — or any address book — yourself. That is one bulk import instead of one write
          per person, and the next sync recognises those people and links them up instead of adding
          them again.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          render={<a href={SEED_ALL_HREF} download />}
          variant="outline"
          size="sm"
          className="min-h-11"
        >
          <Download />
          Download all {authoredCount} contact{authoredCount === 1 ? "" : "s"}
        </Button>
      </div>

      {targets.length > 0 ? (
        <div className="space-y-2 border-t border-seam pt-2.5">
          <p className="text-xs text-fog">
            Or just the people a connected account is still missing — whoever it already has is
            left out, so nothing arrives twice.
          </p>
          <div className="flex flex-wrap gap-2">
            {targets.map((connection) => (
              <Button
                key={connection.id}
                render={<a href={seedHref(connection.provider)} download />}
                variant="outline"
                size="sm"
                className="min-h-11"
              >
                <Download />
                Download for {labelFor(connection.provider)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
