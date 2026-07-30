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

## Device calendar

The **Calendar** header action (`src/app/calendar.tsx`) shows this phone's real
events and your Dhaga follow-ups in one agenda, and writes the follow-ups out to
the device calendar. Like sync, both directions are user-triggered — opening the
screen reads, the button writes, and nothing happens in the background.

There is **no OAuth here, deliberately.** The web app connects to Google/
Microsoft with tokens; the phone does not need to. iOS and Android already relay
the device calendar to iCloud/Google, exactly as they do the address book (see
"Two-way contact sync" above), so a follow-up written into a calendar this phone
owns reaches the user's laptop and watch with no token and no scope screen.

**Where follow-ups land, and what that costs:**

- Dhaga writes **only** into a secondary calendar named `Dhaga`
  (`DHAGA_CALENDAR_NAME` in `packages/core/src/calendar/follow-up-event.ts` —
  the same constant the web write-out uses). Your own calendars are read and
  never written. Hiding or deleting that one calendar undoes the whole feature.
- **iOS** — the new calendar is filed under the same *source* as your default
  calendar, so if that is iCloud the follow-ups reach your other devices. That
  is a read of the default calendar's account, not a write to the calendar. If
  the source is local-only, the screen says so.
- **Android** — `CalendarContract` gives no way to add a calendar to a Google
  account that Google's sync adapter will pick up, so the Dhaga calendar is
  created under a local account and stays on the handset. The screen says so,
  same as it does for contact creates.
- An open follow-up with a due date gets an all-day event; completing,
  dismissing, clearing the due date, or deleting the follow-up **removes** it.
  `src/lib/calendar/links.ts` maps followUpId → device event id (the phone's
  stand-in for the web's `calendar_event_links` table), which is what makes a
  second run update events instead of duplicating them.

**Not finished:** the screen fetches follow-ups from `GET /api/follow-ups`,
which **does not exist yet** — no api-key-authenticated route publishes
follow-ups, and the one that carries them (`GET /api/export/json`) dumps the
whole graph including every scanned card's base64 image. Until that route ships
the follow-up half of the screen shows an error and the device agenda works
normally. `FollowUpSummary` (`src/lib/calendar/types.ts`) is the contract it
should serve, and belongs in `packages/core/src/api/follow-ups.ts` once it does.

Pure parts (field mapping, container selection, write shaping; calendar
selection, write planning, agenda merging) are unit-tested. The native I/O
paths — `src/lib/sync/device-target.ts`, `src/lib/calendar/device.ts` and
`src/lib/calendar/write.ts` — need a real device and are **not** covered here:

```sh
npm run test --workspace @dhaga/mobile
```
