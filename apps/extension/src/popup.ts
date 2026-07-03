import { getBaseUrl } from "./config";

const rawInput = document.getElementById("raw") as HTMLTextAreaElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;

let sourceUrl = "";

function setStatus(html: string, isError = false): void {
  status.innerHTML = html;
  status.className = isError ? "error" : "";
}

/** Pre-fill with the page selection — reading only on explicit user click
 *  of the extension (activeTab), never in the background. */
async function prefillFromPage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("http")) return;
  sourceUrl = tab.url;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? "",
    });
    const selection = (result?.result ?? "").trim();
    rawInput.value = selection || `${tab.title ?? ""}\n${tab.url}`;
  } catch {
    rawInput.value = `${tab.title ?? ""}\n${tab.url}`;
  }
}

async function save(): Promise<void> {
  const raw = rawInput.value.trim();
  if (!raw) {
    setStatus("Nothing to capture — select or paste their details first.", true);
    return;
  }
  saveButton.disabled = true;
  setStatus("Extracting…");
  const base = await getBaseUrl();
  try {
    const response = await fetch(`${base}/api/capture`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, sourceUrl }),
    });
    const body = (await response.json()) as {
      id?: string;
      name?: string;
      via?: string;
      notice?: string | null;
      error?: string;
    };
    if (!response.ok) {
      const hint =
        response.status === 401
          ? ` <a href="${base}/login" target="_blank">Sign in to Dhaga</a> and retry.`
          : "";
      setStatus(`${body.error ?? "Capture failed."}${hint}`, true);
      return;
    }
    setStatus(
      `Saved <a href="${base}/app/people/${body.id}" target="_blank">${body.name}</a>` +
        `${body.via === "heuristic" ? " (parsed offline — review the fields)" : ""}.` +
        `${body.notice ? `<br>${body.notice}` : ""}`,
    );
    rawInput.value = "";
  } catch {
    setStatus(`Could not reach Dhaga at ${base} — is it running?`, true);
  } finally {
    saveButton.disabled = false;
  }
}

saveButton.addEventListener("click", () => void save());
void prefillFromPage();
