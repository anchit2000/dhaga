import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

import { SETTINGS_KEYS } from "@/utils/constants";

import type { MobileSettings } from "@/types";

export async function loadSettings(): Promise<MobileSettings> {
  const [baseUrl, apiKey] = await Promise.all([
    getItemAsync(SETTINGS_KEYS.baseUrl),
    getItemAsync(SETTINGS_KEYS.apiKey),
  ]);
  return { baseUrl: baseUrl ?? "", apiKey: apiKey ?? "" };
}

export async function saveSettings(settings: MobileSettings): Promise<MobileSettings> {
  const normalized: MobileSettings = {
    baseUrl: settings.baseUrl.trim().replace(/\/+$/, ""),
    apiKey: settings.apiKey.trim(),
  };
  await Promise.all([
    writeOrClear(SETTINGS_KEYS.baseUrl, normalized.baseUrl),
    writeOrClear(SETTINGS_KEYS.apiKey, normalized.apiKey),
  ]);
  return normalized;
}

export function isConfigured(settings: MobileSettings): boolean {
  return settings.baseUrl.length > 0 && settings.apiKey.length > 0;
}

async function writeOrClear(key: string, value: string): Promise<void> {
  if (value) await setItemAsync(key, value);
  else await deleteItemAsync(key);
}
