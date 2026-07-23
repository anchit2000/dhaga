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

function setStatus(content: string | Array<string | Node>, isError = false): void {
  const parts = typeof content === "string" ? [content] : content;
  status.replaceChildren(...parts);
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
      const parts: Array<string | Node> = [body.error ?? "Capture failed."];
      if (response.status === 401) {
        const signIn = document.createElement("a");
        signIn.href = `${base}/login`;
        signIn.target = "_blank";
        signIn.textContent = "Sign in to Dhaga";
        parts.push(" ", signIn, " and retry.");
      }
      setStatus(parts, true);
      return;
    }
    const contactLink = document.createElement("a");
    contactLink.href = `${base}/app/people/${body.id}`;
    contactLink.target = "_blank";
    contactLink.textContent = body.name ?? "";
    const parts: Array<string | Node> = [
      attachMode ? "Attached to" : "Saved",
      " ",
      contactLink,
      `${body.via === "heuristic" ? " (parsed offline — review the fields)" : ""}.`,
    ];
    if (body.notice) {
      parts.push(document.createElement("br"), body.notice);
    }
    setStatus(parts);
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
