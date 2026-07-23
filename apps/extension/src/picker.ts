import { getBaseUrl } from "./config";

export interface ContactHit {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
}

export const attachElements = {
  picker: document.getElementById("contactPicker") as HTMLDivElement,
  search: document.getElementById("contactSearch") as HTMLInputElement,
  results: document.getElementById("results") as HTMLUListElement,
};

let debounce: ReturnType<typeof setTimeout> | undefined;

/** Debounced contact lookup against /api/contacts; click selects. */
export function renderResults(
  query: string,
  onSelect: (hit: ContactHit) => void,
): Promise<void> {
  return new Promise((resolve) => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const base = await getBaseUrl();
      try {
        const response = await fetch(
          `${base}/api/contacts?q=${encodeURIComponent(query)}`,
          { credentials: "include" },
        );
        if (!response.ok) return resolve();
        // A faster later keystroke's response can land before this one — only
        // render if this call's query still matches what's in the box, or a
        // slower, now-stale query could overwrite fresher results on screen.
        if (attachElements.search.value !== query) return resolve();
        const body = (await response.json()) as { contacts: ContactHit[] };
        attachElements.results.replaceChildren(
          ...body.contacts.map((hit) => {
            const item = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            const sub = [hit.title, hit.companyName].filter(Boolean).join(" · ");
            button.append(document.createTextNode(hit.name));
            if (sub) {
              const subSpan = document.createElement("span");
              subSpan.className = "sub";
              subSpan.textContent = sub;
              button.append(document.createTextNode(" "), subSpan);
            }
            button.addEventListener("click", () => {
              onSelect(hit);
              for (const other of attachElements.results.querySelectorAll("button")) {
                other.classList.remove("selected");
              }
              button.classList.add("selected");
            });
            item.append(button);
            return item;
          }),
        );
      } finally {
        resolve();
      }
    }, 250);
  });
}
