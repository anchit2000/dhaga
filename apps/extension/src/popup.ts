import { getBaseUrl } from "./config";
import { attachElements, renderResults, type ContactHit } from "./picker";

const rawInput = document.getElementById("raw") as HTMLTextAreaElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;
const modeNew = document.getElementById("modeNew") as HTMLButtonElement;
const modeAttach = document.getElementById("modeAttach") as HTMLButtonElement;

let sourceUrl = "";
let attachMode = false;
let selectedContact: ContactHit | null = null;

function setStatus(html: string, isError = false): void {
  status.innerHTML = html;
  status.className = isError ? "error" : "";
}

function setMode(attach: boolean): void {
  attachMode = attach;
  modeNew.classList.toggle("active", !attach);
  modeAttach.classList.toggle("active", attach);
  attachElements.picker.style.display = attach ? "block" : "none";
  saveButton.textContent = attach ? "Attach to contact" : "Save to my network";
}

/** Pre-fill with the page selection — read only on explicit user click. */
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
    setStatus("Nothing to capture — select or paste something first.", true);
    return;
  }
  if (attachMode && !selectedContact) {
    setStatus("Pick who this is about first.", true);
    return;
  }
  saveButton.disabled = true;
  setStatus(attachMode ? "Attaching…" : "Extracting…");
  const base = await getBaseUrl();
  try {
    const response = await fetch(`${base}/api/capture`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw,
        sourceUrl,
        contactId: attachMode ? selectedContact?.id : undefined,
      }),
    });
    const body = (await response.json()) as {
      id?: string; name?: string; via?: string; notice?: string | null; error?: string;
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
      `${attachMode ? "Attached to" : "Saved"} <a href="${base}/app/people/${body.id}" target="_blank">${body.name}</a>` +
        `${body.via === "heuristic" ? " (parsed offline — review the fields)" : ""}.` +
        `${body.notice ? `<br>${body.notice}` : ""}`,
    );
    rawInput.value = "";
  } catch {
    const granted = await chrome.permissions.contains({
      origins: [`${new URL(base).origin}/*`],
    });
    setStatus(
      granted
        ? `Could not reach Dhaga at ${base} — is it running?`
        : `Dhaga needs access to ${base} — re-save the URL in the extension options to grant it.`,
      true,
    );
  } finally {
    saveButton.disabled = false;
  }
}

modeNew.addEventListener("click", () => setMode(false));
modeAttach.addEventListener("click", () => setMode(true));
attachElements.search.addEventListener("input", () => {
  void renderResults(attachElements.search.value, (hit) => {
    selectedContact = hit;
  });
});
saveButton.addEventListener("click", () => void save());
void prefillFromPage();
