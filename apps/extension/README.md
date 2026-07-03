# Dhaga browser extension (v0)

One-click capture: select a person's details on any page (LinkedIn profile,
article byline, speaker list), click the Dhaga icon, save. The selection goes
through the same extraction pipeline as web quick-add and is stored with the
page URL as its receipt note.

## Build & install

```bash
npm run build --workspace @dhaga/extension
```

Then in Chrome/Edge: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → pick `apps/extension/dist`.

## Requirements

- The Dhaga web app running (default `http://localhost:3000`) and you signed
  in — the extension reuses your session cookie.
- Self-hosting on another domain? Set it in the extension options **and** add
  it to `host_permissions` in `manifest.json`, then rebuild and reload.

## Privacy posture

The extension reads the active tab **only when you click it** (`activeTab`) —
no background scraping, no content scripts running on every page. What you
selected is exactly what gets sent, and only to your own Dhaga instance.

- `.gitignore`d: `dist/`
