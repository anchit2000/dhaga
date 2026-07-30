# Dhaga Mobile (M0 spike)

Expo app (SDK 57) proving the capture loop: camera → on-device OCR (Apple
Vision on iOS, ML Kit on Android via `expo-text-extractor`) → `POST
/api/capture` on your Dhaga server → contact saved. If OCR output looks
unusable, the app falls back to uploading the photo for a server-side vision
parse (`src/lib/ocr.ts`).

Native modules mean **Expo Go can't run this app** — build the dev client
once per platform, then iterate on JS without rebuilding.

## One-time setup

1. In the Dhaga **web app** → Settings → API keys, create a key.
2. Build + install the dev client on your device:
   - **Android** (Windows/Linux/macOS; needs Android Studio + JDK 17, device
     on USB with debugging enabled):

     ```sh
     cd apps/mobile
     npx expo run:android
     ```

   - **iPhone** (macOS only; needs Xcode — free provisioning works for a
     personal device):

     ```sh
     cd apps/mobile
     npx expo run:ios --device
     ```

   - No local toolchain? Cloud builds: `eas build -p android --profile
     development` / `eas build -p ios --profile development` (see `eas.json`).

## Daily loop

```sh
cd apps/mobile
npx expo start --dev-client
```

JS changes hot-reload into the installed dev client; rebuild natively only
when native dependencies change.

In the app's setup screen, enter:

- **Server address** — where the Dhaga web app runs. For local dev use the
  dev machine's LAN IP (`http://192.168.x.x:3000`), not `localhost`. If the
  phone can't reach it, start Next with `next dev -H 0.0.0.0` and allow the
  firewall prompt.
- **API key** — the key from step 1 (stored in the phone's secure storage).

Scan a card; the result banner shows which pipeline ran (`on-device OCR` vs
`photo scan`) and the parse tier (`AI parse` vs `offline parse`).

## Two-way contact sync

The **Sync contacts** header action (`src/app/sync.tsx`) reconciles this
phone's address book with Dhaga in both directions. It is user-triggered
only — nothing is read or written in the background. The three-way merge runs
on the server, which holds the last-synced base snapshot; the phone only does
the platform I/O (`src/lib/sync/`).

Dhaga touches only the fields it manages (name, nickname, job title, company,
emails, phones, links, addresses, dates) and writes them with the modern
`contact.patch()`, which leaves every other field on the record untouched.

An address book larger than `SYNC_MAX_CONTACTS` (1000, shared with the server
in `packages/core/src/api/sync-limits.ts`) goes up as several sequential
requests — the screen counts them off as "batch N of M". No chunk claims to be
the whole address book; instead the LAST one carries every external id the
container held (`observedExternalIds`), which is what lets the server tell a
contact deleted on the phone from one that simply rode another chunk. Ids are
cheap, so that stays one small field however big the book is.

**Where new contacts land, and what that costs:**

- **iOS** — containers are enumerated (`Container.getAll` / `getType`) and the
  first one whose type is `cardDAV` (iCloud, Google) or `exchange` is used, so
  a Dhaga edit rides the account's own sync to your other devices with no
  OAuth. If only local ("On My iPhone") containers exist, sync still runs and
  the screen says plainly that changes stay on the handset.
- **Android** — expo-contacts exposes no account/container concept: the
  `Container` class throws `Not implemented`, and a created raw contact is
  inserted with no `ACCOUNT_TYPE`, which the OS stores as device-local. Edits
  to contacts you already have still ride whatever account owns them, but
  contacts Dhaga **creates** stay on the phone. The sync screen says so.

Creates go through the legacy `addContactAsync(contact, containerId)` because
the modern `Contact.create()` takes no container and always writes to the
store's default one. Everything else uses the modern class API.

Pure parts (field mapping, container selection, write shaping) are unit-tested:

```sh
npm run test --workspace @dhaga/mobile
```
