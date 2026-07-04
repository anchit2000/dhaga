import { headers } from "next/headers";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";
import { getBillingGate } from "@/lib/hosted/gate";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { countCardImages } from "@/lib/repo/card-images";
import { CardPhotoSetting } from "@/components/app/settings/CardPhotoSetting";
import { ApiKeysSetting } from "@/components/app/settings/ApiKeysSetting";
import { BillingSetting } from "@/components/app/settings/BillingSetting";
import { SecuritySetting } from "@/components/app/settings/SecuritySetting";

export const metadata = { title: "Settings — Dhaga" };

export default async function SettingsPage() {
  const userId = await requireUserIdForPage();
  const auth = await getAuth();
  const [storePhotos, photoCount, apiKeys, planSummary, session] = await Promise.all([
    shouldStoreCardPhotos(),
    countCardImages(),
    auth.api.listApiKeys({ headers: await headers() }),
    (await getBillingGate()).getPlanSummary(userId),
    auth.api.getSession({ headers: await headers() }),
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
    </div>
  );
}
