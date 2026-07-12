import { headers } from "next/headers";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";
import { getBillingGate } from "@/lib/hosted/gate";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { countCardImages } from "@/lib/repo/card-images";
import { getSuggestedClusters } from "@/lib/repo/suggestions";
import { ImportPanel } from "@/components/app/import/ImportPanel";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";
import { CardPhotoSetting } from "@/components/app/settings/CardPhotoSetting";
import { ApiKeysSetting } from "@/components/app/settings/ApiKeysSetting";
import { BillingSetting } from "@/components/app/settings/BillingSetting";
import { SecuritySetting } from "@/components/app/settings/SecuritySetting";

export const metadata = { title: "Settings — Dhaga" };

export default async function SettingsPage() {
  const userId = await requireUserIdForPage();
  const auth = await getAuth();
  const [storePhotos, photoCount, apiKeys, planSummary, session, clusters] = await Promise.all([
    shouldStoreCardPhotos(),
    countCardImages(),
    auth.api.listApiKeys({ headers: await headers() }),
    (await getBillingGate()).getPlanSummary(userId),
    auth.api.getSession({ headers: await headers() }),
    getSuggestedClusters(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fog">
          Everything here is about what Dhaga keeps — and only for you.
        </p>
      </div>
      {planSummary ? <BillingSetting summary={planSummary} /> : null}
      <SecuritySetting
        // twoFactorEnabled is added to the user row by the twoFactor plugin —
        // not part of the base session type getSession() is statically typed with.
        twoFactorEnabled={Boolean((session?.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled)}
      />
      <CardPhotoSetting enabled={storePhotos} count={photoCount} />
      <ApiKeysSetting keys={apiKeys.apiKeys} />
      <section id="import" className="scroll-mt-20 space-y-4 rounded-2xl border border-seam bg-panel p-5">
        <div>
          <h2 className="font-display text-lg">Import contacts</h2>
          <p className="mt-1 text-sm text-fog">
            Bring in a Google Contacts or LinkedIn CSV. Parsing happens in your browser,
            and existing people are skipped safely.
          </p>
        </div>
        <ImportPanel />
        <div className="border-t border-seam pt-4">
          <p className="text-sm font-medium text-paper">Connected contacts</p>
          <p className="mt-1 text-xs text-fog">
            Direct Google and on-device contact sync are not connected yet. They will
            require explicit account or device permission before Dhaga reads anything.
          </p>
        </div>
      </section>
      {clusters.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg">Suggested groups</h2>
          <SuggestionsPanel clusters={clusters} />
        </section>
      ) : null}
    </div>
  );
}
