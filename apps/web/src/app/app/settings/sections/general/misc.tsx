import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/config";
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
  const { apiKeys } = await auth.api.listApiKeys({ headers: await headers() });
  return <ApiKeysSetting keys={apiKeys} />;
}
