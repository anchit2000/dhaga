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
