# Contact Import — Setup & How-To

Dhaga imports contacts three ways. Two work with **no setup**; the OAuth
connectors and the mobile app need one-time configuration, documented here so
you can do it yourself later.

| Path | Setup needed | Covers |
|---|---|---|
| **File import (.vcf / CSV)** | None — works today | iPhone, iCloud, Android, Google, LinkedIn, Outlook (any exported file) |
| **Connect Google / Outlook** (one-click OAuth) | Google Cloud + Azure app config (below) | Google Contacts; Outlook / Hotmail / Live |
| **Mobile device import** (expo-contacts) | A native app build (below) | The contacts already on the phone |

There is **no "Connect iCloud/Apple"** option — Apple provides no contacts API.
For Apple/iCloud, use the `.vcf` file path (see "End-user export steps").

---

## 1. File import (no setup — already live)

In the app: **Import** (top nav) or **Settings → Import**. Drop a `.vcf` or
`.csv`; everything is parsed in the browser, you review and select rows, and
only the selected contacts are uploaded. See "End-user export steps" for how to
produce the file on each device.

> Very large files (100k+ contacts, ~40 MB+) will warn you and may be slow —
> split the `.vcf` into a few smaller files if needed.

---

## 2. "Connect Google Contacts" — Google Cloud setup

**What you do once:**

1. **Google Cloud Console** (https://console.cloud.google.com) → create or pick a project.
2. **APIs & Services → Library →** enable the **People API**.
3. **APIs & Services → OAuth consent screen:**
   - User type **External**. Fill app name, support email, developer email, an
     app homepage and a **privacy policy URL** (required for the next step).
   - **Add scope** `https://www.googleapis.com/auth/contacts.readonly`
     (`contacts.readonly`). This is a **sensitive** scope.
   - **Test users:** while the app is unverified you can add up to 100 test
     users (add yourself + your dad's Google address). It works **immediately**
     for them, with an "unverified app" warning screen they click through.
   - **For public use:** click **Publish app** and submit for **verification**
     (Google reviews the app; may ask for a demo video + the privacy policy).
     Sensitive scopes need verification but **not** a paid third-party security
     assessment (that's only for "restricted" scopes like Gmail/Drive).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application.** Add the **Authorized redirect URI**:
   ```
   https://YOUR_DOMAIN/api/auth/callback/google
   ```
   (for local dev also add `http://localhost:3000/api/auth/callback/google`).
   Copy the **Client ID** and **Client secret**.
5. **Set env vars** (see §5) and redeploy. The "Connect Google Contacts" button
   appears automatically once `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.

> The code already requests `access_type=offline` + `prompt=consent` for Google,
> so a refresh token is issued and the connection keeps working past 1 hour.

---

## 3. "Connect Outlook / Hotmail" — Microsoft Azure setup

Covers Outlook.com, Hotmail, Live, and Microsoft 365 contacts.

1. **Azure Portal** (https://portal.azure.com) → **Microsoft Entra ID → App
   registrations → New registration.**
2. **Supported account types:** *"Accounts in any organizational directory and
   personal Microsoft accounts"* (this is what lets Hotmail/Live/Outlook.com in;
   it corresponds to the `common` tenant).
3. **Redirect URI (platform: Web):**
   ```
   https://YOUR_DOMAIN/api/auth/callback/microsoft
   ```
   (+ `http://localhost:3000/api/auth/callback/microsoft` for local dev).
4. **API permissions → Add a permission → Microsoft Graph → Delegated:** add
   **`Contacts.Read`**, **`offline_access`**, **`User.Read`**, then **Grant admin
   consent** (or let each user consent at connect time).
5. **Certificates & secrets → New client secret** → copy the **Value** (not the
   ID). Copy the **Application (client) ID** from the Overview page.
6. **Set env vars** (§5) and redeploy. For broad public use, complete
   **Publisher verification** in Azure so users don't see an "unverified" notice.

---

## 4. Mobile app — device contact import (expo-contacts)

The mobile app can read the phone's own contacts (a native permission prompt).
Because this adds a native module, it needs a **new build** — it will not appear
via an over-the-air JS update or in plain Expo Go.

1. From `apps/mobile/`, the dependency + config plugin are already added
   (`expo-contacts` in `package.json`, and the permission string in `app.json`).
   If dependencies changed, run `npm install` in `apps/mobile/`.
2. Make a dev/native build:
   - Local: `cd apps/mobile && npx expo prebuild && npx expo run:ios`
     (or `run:android`), or
   - Cloud: `eas build --profile development --platform ios` (and `android`).
3. On first use, the app asks for **Contacts** permission (iOS shows the
   `NSContactsUsageDescription` string; Android requests `READ_CONTACTS`). If
   denied, the screen offers an "Open Settings" fallback.
4. In the app: the **Import contacts** screen (header button) lists device
   contacts to select and import. It posts to the web `POST /api/import` using
   the same **API key** you paste on the mobile Setup screen — no extra config.

> This is shipped **as code, pending on-device testing**. Build it and try it on
> a real device/simulator before relying on it.

---

## 5. Environment variables

Set these on the web deployment (Vercel project env, or your container env).
Each connector's button only shows when both of its vars are present, so leaving
a pair unset simply hides that connector — safe for self-hosting.

| Variable | For | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google login + Contacts | From Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google login + Contacts | " |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google One-Tap (optional) | Same client id, client-exposed |
| `MICROSOFT_CLIENT_ID` | Outlook/Hotmail | Azure Application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Outlook/Hotmail | Azure client secret **value** |
| `MICROSOFT_TENANT_ID` | Outlook/Hotmail | `common` (default if unset) |

Provider OAuth tokens are stored **encrypted at rest** (Better Auth
`encryptOAuthTokens`), consistent with the privacy rules — no plaintext tokens.

---

## 6. End-user export steps (no account connection needed)

These are also shown inside the app's Import screen.

**iPhone / iCloud → `.vcf`:** on a computer, sign in to **iCloud.com →
Contacts**, press **⌘A / Ctrl+A** to select everyone → gear (bottom-left) →
**Export vCard**. (On the phone you can also open one contact → **Share Contact
→ .vcf**, but iCloud.com exports everyone at once.) If contacts aren't in iCloud
yet: **Settings → [name] → iCloud → turn on Contacts** first.

**Android → `.vcf`:** **Contacts app → Settings → Export → Export to .vcf file**,
then move the file to your computer.

**Google Contacts → `.vcf` or CSV:** **contacts.google.com → Export** (left
sidebar) → choose **vCard** (for the .vcf importer) or **Google CSV** (also
supported).

**LinkedIn → CSV:** **My Network → Connections → Manage synced contacts** (or
**Settings → Data privacy → Get a copy of your data → Connections**), then
upload the `Connections.csv`.

**Moving iPhone → Android (then import):** the common route is Google — on the
iPhone, **Settings → Contacts → Accounts → add the Google account → enable
Contacts**; they sync to Google, appear on the Android phone, and can be
imported here via **Connect Google Contacts** or a Google `.vcf`/CSV export.
Alternatively export a `.vcf` from iCloud.com and import it at
**contacts.google.com → Import**.

---

## 7. What needs verification before public launch (summary)

- **Google:** publish + pass OAuth verification for the sensitive `contacts.readonly`
  scope (works now for you + up to 100 test users).
- **Microsoft:** publisher verification for a clean consent screen.
- **Mobile:** a real device/simulator build to exercise the contacts permission.

Until then, the **file import (.vcf / CSV)** path needs none of the above and
already covers every source.
