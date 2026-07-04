import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl } from "./config";

const input = document.getElementById("baseUrl") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLSpanElement;

function setStatus(text: string, isError = false): void {
  status.textContent = text;
  status.className = isError ? "error" : "";
}

void getBaseUrl().then((url) => {
  input.value = url === DEFAULT_BASE_URL ? "" : url;
});

/** Custom instances need a runtime host grant — store installs can't edit the manifest. */
async function ensureOriginPermission(url: string): Promise<boolean> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }
  if (origin === new URL(DEFAULT_BASE_URL).origin) return true;
  return chrome.permissions.request({ origins: [`${origin}/*`] });
}

saveButton.addEventListener("click", () => {
  const url = input.value.trim() || DEFAULT_BASE_URL;
  void ensureOriginPermission(url).then((granted) => {
    if (!granted) {
      setStatus("Enter a valid URL and allow access to it.", true);
      return;
    }
    void setBaseUrl(url).then(() => {
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1500);
    });
  });
});
