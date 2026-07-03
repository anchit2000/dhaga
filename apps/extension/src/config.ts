export const DEFAULT_BASE_URL = "http://localhost:3000";

export async function getBaseUrl(): Promise<string> {
  const stored = await chrome.storage.sync.get("baseUrl");
  const value = typeof stored.baseUrl === "string" ? stored.baseUrl.trim() : "";
  return (value || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export async function setBaseUrl(url: string): Promise<void> {
  await chrome.storage.sync.set({ baseUrl: url.trim().replace(/\/$/, "") });
}
