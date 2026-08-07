import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/config";
import { requireUserId } from "@/lib/auth/guard";
import { hasFeature } from "@/lib/entitlements";
import { API_KEY_PLAN_GATE_REASON } from "@/utils/constants/api-keys";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { listVocab } from "@/lib/repo/voice-vocab";
import { countCardImages } from "@/lib/repo/card-images";
import { CardPhotoSetting } from "@/components/app/settings/CardPhotoSetting";
import { VoiceTeaching } from "@/components/app/settings/VoiceTeaching";
import { ApiKeysSetting } from "@/components/app/settings/ApiKeysSetting";

export async function CardPhotoSection() {
  const [enabled, count] = await Promise.all([shouldStoreCardPhotos(), countCardImages()]);
  return <CardPhotoSetting enabled={enabled} count={count} />;
}

export async function VoiceTeachingSection() {
  const terms = await listVocab();
  return <VoiceTeaching terms={terms} />;
}

export async function ApiKeysSection() {
  const auth = await getAuth();
  const userId = await requireUserId();
  const [{ apiKeys }, entitled] = await Promise.all([
    auth.api.listApiKeys({ headers: await headers() }),
    hasFeature(userId, "multi_device_sync"),
  ]);
  // Resolved server-side so a free user sees the reason BEFORE clicking; the
  // real refusal is `createApiKeyAction`'s requireFeature, not this flag.
  return (
    <ApiKeysSetting
      keys={apiKeys}
      createGate={entitled ? null : API_KEY_PLAN_GATE_REASON}
    />
  );
}
