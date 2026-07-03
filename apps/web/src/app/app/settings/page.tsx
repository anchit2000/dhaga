import { requireSessionPage } from "@/lib/auth/guard";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { countCardImages } from "@/lib/repo/card-images";
import { CardPhotoSetting } from "@/components/app/settings/CardPhotoSetting";

export const metadata = { title: "Settings — Dhaga" };

export default async function SettingsPage() {
  await requireSessionPage();
  const [storePhotos, photoCount] = await Promise.all([
    shouldStoreCardPhotos(),
    countCardImages(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fog">
          Everything here is about what Dhaga keeps — and only for you.
        </p>
      </div>
      <CardPhotoSetting enabled={storePhotos} count={photoCount} />
    </div>
  );
}
