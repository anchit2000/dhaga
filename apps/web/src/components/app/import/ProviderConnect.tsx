"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import {
  fetchProviderContactsAction,
  getContactProviderAvailabilityAction,
} from "@/lib/actions/import";
import { CONTACT_IMPORT_PROVIDERS } from "@/utils/constants/auth";
import type { ContactImportProviderId } from "@/utils/constants/auth";
import type { ImportCandidate, ImportFormat } from "@/lib/import";

interface ProviderConnectProps {
  onCandidates: (candidates: ImportCandidate[], format: ImportFormat) => void;
}

/**
 * Connect-and-import row for OAuth contact providers (Google / Outlook). A
 * button appears only for env-configured providers. First click may bounce
 * through linkSocial for consent; on return (?provider= in the URL) the fetch
 * re-runs automatically and hands candidates to the parent review flow.
 * Provider/token access stays server-side — this only calls server actions.
 */
export function ProviderConnect({ onCandidates }: ProviderConnectProps) {
  const searchParams = useSearchParams();
  const [available, setAvailable] = useState<ContactImportProviderId[]>([]);
  const [busy, setBusy] = useState<ContactImportProviderId | null>(null);

  const fetchFrom = useCallback(
    async (provider: ContactImportProviderId): Promise<void> => {
      const meta = CONTACT_IMPORT_PROVIDERS.find(({ id }) => id === provider);
      if (!meta) return;
      setBusy(provider);
      try {
        const result = await fetchProviderContactsAction(provider);
        if (result.ok) {
          if (result.candidates.length === 0) {
            toast.info(`No contacts found in your ${meta.label} account.`);
            return;
          }
          onCandidates(result.candidates, provider);
          return;
        }
        if (result.needsConnect) {
          // Redirects to the provider consent screen and back to /app/settings
          // (where this panel lives) with ?provider= so the fetch re-runs.
          await authClient.linkSocial({
            provider,
            scopes: [meta.scope],
            callbackURL: `/app/settings?provider=${provider}#import`,
          });
          return;
        }
        toast.error(result.error);
      } catch {
        toast.error("Couldn't reach the import service. Try again.");
      } finally {
        setBusy(null);
      }
    },
    [onCandidates],
  );

  useEffect(() => {
    void getContactProviderAvailabilityAction().then(setAvailable);
  }, []);

  useEffect(() => {
    const returned = searchParams.get("provider");
    if (returned !== "google" && returned !== "microsoft") return;
    // Deferred so the fetch's setState doesn't run synchronously in the effect.
    queueMicrotask(() => void fetchFrom(returned));
  }, [searchParams, fetchFrom]);

  const providers = CONTACT_IMPORT_PROVIDERS.filter(({ id }) => available.includes(id));
  if (providers.length === 0) return null;

  return (
    <div className="mb-6 border-b border-seam pb-6">
      <p className="text-xs uppercase tracking-wide text-fog">Connect an account</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void fetchFrom(provider.id)}
          >
            {busy === provider.id ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect {provider.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
