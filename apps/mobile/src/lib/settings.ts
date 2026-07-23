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

/**
 * True when the API key would ride an unencrypted `http://` connection to a
 * non-loopback host — i.e. sniffable on shared WiFi. Loopback (localhost /
 * 127.0.0.1 / ::1) is exempt so local tunnels still work without a warning;
 * LAN IPs are intentionally NOT exempt (they're the risky case). Anything on
 * `https://` (or an empty/unparseable value) returns false.
 */
export function isInsecureBaseUrl(baseUrl: string): boolean {
  const trimmed = baseUrl.trim().toLowerCase();
  if (!trimmed.startsWith("http://")) return false;
  const host = trimmed.slice("http://".length).split("/")[0].split(":")[0];
  return host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && host !== "[::1]";
}

async function writeOrClear(key: string, value: string): Promise<void> {
  if (value) await setItemAsync(key, value);
  else await deleteItemAsync(key);
}
