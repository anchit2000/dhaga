import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl } from "./config";

const input = document.getElementById("baseUrl") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLSpanElement;

void getBaseUrl().then((url) => {
  input.value = url === DEFAULT_BASE_URL ? "" : url;
});

saveButton.addEventListener("click", () => {
  void setBaseUrl(input.value || DEFAULT_BASE_URL).then(() => {
    status.textContent = "Saved";
    setTimeout(() => (status.textContent = ""), 1500);
  });
});
