# Dhaga browser extension

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
- Self-hosting on another domain? Set it in the extension options — you'll be
  prompted to allow the extension access to that domain (runtime host
  permission; no manifest editing needed).

## Store packaging

```bash
npm run package --workspace @dhaga/extension
```

Builds `dist/` and zips it into `dhaga-extension-v<version>.zip` (gitignored),
ready to upload to the Chrome Web Store / Edge Add-ons. Listing copy, privacy
disclosures, and the screenshots checklist live in
[STORE_LISTING.md](STORE_LISTING.md).

## Privacy posture

The extension reads the active tab **only when you click it** (`activeTab`) —
no background scraping, no content scripts running on every page. What you
selected is exactly what gets sent, and only to your own Dhaga instance.

- `.gitignore`d: `dist/`
