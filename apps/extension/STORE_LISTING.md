# Chrome Web Store submission — Dhaga extension v1.0.0

Everything below is ready to paste into the [developer dashboard](https://chrome.google.com/webstore/devconsole).
The upload artifact is `dhaga-extension-v1.0.0.zip` (rebuild any time with
`npm run package --workspace @dhaga/extension`).

The app is live at `https://www.dhaga.app` (privacy policy:
[/privacy](https://www.dhaga.app/privacy) — verified 200, 2026-07-04).

**Remaining before you can submit:**

1. **Reviewer test account** — create a demo account on the live instance
   (seed it with a few demo contacts) and fill its credentials into the review
   notes below. Reviewers can't reach `localhost`, so without this the
   extension may be rejected as non-functional.
2. One-time: a developer account ($5 registration fee) on the dashboard.

---

## Store listing tab

| Field | Value |
|---|---|
| Name | `Dhaga — capture to your network` |
| Category | Productivity → Workflow & Planning |
| Language | English |
| Store icon | Upload `icons/icon-128.png` (128×128, brand thread on ink) |

**Summary** (132-char limit; this is 125):

> Select a person's details on any page and save them to your private Dhaga graph in one click — the page stays as the receipt.

**Description:**

```
Dhaga (धागा — "thread") is an open-source, privacy-first personal CRM: your
professional memory, augmented. This extension is its capture surface for the
browser — highlight a person's details anywhere (a LinkedIn profile you're
viewing, an article byline, a speaker list, an email signature) and save them
to your own Dhaga graph in one click.

WHAT IT DOES
• New contact: your selection is extracted into structured fields (name,
  title, company, email, phone) and saved with the page URL as its source
  receipt.
• Attach to a contact: save the current article or page to someone already in
  your network ("save this to Sarah") — it lands on their timeline as a note.
• Every AI-derived fact keeps a receipt: you can always see where it came from,
  and deleting the source deletes what was derived from it.

PRIVACY, BY DESIGN
• Reads the page only when you click the icon (activeTab) — no background
  scripts, no scraping, nothing runs on pages you visit.
• Exactly what you selected is exactly what is sent — and only to your own
  Dhaga instance (self-hosted or Dhaga Cloud). No third-party servers, no
  analytics, no tracking.
• Open source (AGPL-3.0): read the code, run it yourself.
  https://github.com/anchit2000/dhaga

REQUIREMENTS
This extension is a companion to the Dhaga app — it needs a Dhaga instance
(self-hosted, or a Dhaga Cloud account) that you are signed in to in this
browser. Point the extension at your instance in its options.
```

## Privacy tab

**Single purpose:**

> Capture contact details the user has explicitly selected on the current page and save them to the user's own Dhaga (personal CRM) instance.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `activeTab` | Read the current tab's selection, title, and URL — only when the user clicks the extension icon, never in the background. |
| `scripting` | One `executeScript` call, on icon click, to read `window.getSelection()` from the active tab. No content scripts are registered. |
| `storage` | Persist one setting: the URL of the user's own Dhaga instance. |
| Host permission `http://localhost:3000/*` | Default address of a self-hosted Dhaga instance the captured contact is saved to. |
| Optional host permissions `https://*/*`, `http://*/*` | Users who host Dhaga on their own domain (or use Dhaga Cloud) grant access to that one origin at runtime from the options page. Nothing is requested at install. |

**Remote code:** No, I am not using remote code. (All JS is bundled in the package.)

**Data usage — what user data do you plan to collect:**

- ✅ **Personally identifiable information** — the text the user selects to capture typically contains a third party's name, job title, email, or phone number. It is sent only to the user's own configured Dhaga instance.
- ✅ **Website content** — the selected text plus the page title/URL (stored as the capture's source receipt), same destination.
- ❌ Everything else (location, web history, user activity, health, financial, authentication, personal communications). Note: the browser attaches the user's own Dhaga session cookie to requests to their own instance; the extension never reads or stores credentials.

**Certifications** (tick all three):

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://www.dhaga.app/privacy`

## Review notes (private, for the reviewer)

```
This extension is a companion to Dhaga, an open-source personal CRM
(https://github.com/anchit2000/dhaga). It saves user-selected text to the
user's own Dhaga instance.

Test setup:
1. Instance: https://www.dhaga.app  — sign in with:
   email: <test-account-email>  password: <test-account-password>
2. In the extension options, set the instance URL to the above and allow
   access when prompted.
3. On any page (e.g. a news article), select a person's name and details,
   click the extension icon, then "Save to my network".
4. The saved contact opens in the Dhaga app with the page URL as its source.

The extension reads the page only via activeTab on explicit click; there are
no content scripts, no background collection, and data goes only to the
instance URL the user configured.
```

## Screenshots checklist

Specs: **1280×800** PNG (preferred; 640×400 also accepted), no alpha, 1–5
images. Consistent dark warm theme; **seeded demo data only — no real
people's PII**. Suggested set, in order:

- [ ] 1. **Hero capture** — an article/profile page with a person's details selected, popup open in "New contact" mode with the selection pre-filled. (This is the first thing people see — make the amber "Save to my network" button visible.)
- [ ] 2. **Saved with a receipt** — the popup success state ("Saved {name}") after capture, showing the link to the contact.
- [ ] 3. **Attach mode** — "Save this article to {contact}": attach tab active, contact search showing 2–3 demo hits, one selected.
- [ ] 4. **The payoff** — the Dhaga contact page showing the captured contact with its source-URL receipt note and extracted facts.
- [ ] 5. **Options** — instance URL setting, underlining the "your own instance" privacy story.

How to shoot: set the browser window so the visible area is 1280×800 (DevTools
→ Ctrl+Shift+P → "Capture screenshot" after setting device dimensions, or a
1280×800 window + Win+Shift+S), load the seeded demo account, capture popup
open states with the popup focused.

Optional but recommended promo assets:

- [ ] Small promo tile 440×280 (used in category pages) — thread logo + one-line tagline on ink
- [ ] Marquee 1400×560 (only if featured — skip for v1)

## Distribution tab

- Visibility: **Public** (open-source project; unlisted would hide it from the
  privacy-conscious audience it targets)
- Regions: all
- Pricing: free

## After Chrome: Edge Add-ons

The same zip uploads unchanged to the
[Edge Add-ons dashboard](https://partner.microsoft.com/dashboard/microsoftedge)
(free registration). Reuse the copy above; Edge's privacy form asks the same
questions.

## When the cloud domain is final

Once Dhaga Cloud has its permanent domain (a custom domain, not the
`dhaga-web.vercel.app` preview address), ship a minor version that adds it to
`host_permissions` so cloud users skip the runtime grant. That's a new zip +
resubmission (version bump required); the optional-permission flow keeps
working for self-hosters. Until then, users on the Vercel address just approve
the one-time access prompt in the options page.
