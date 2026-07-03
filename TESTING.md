# Testing Dhaga — everything built so far

Manual test guide for the web app. Automated unit/e2e tests are not written
yet (tracked in [checklist.md](checklist.md) §0 CI) — this walks every shipped
feature. Check items as you verify them on your machine.

## 0. Setup

```bash
npm install
npm run dev        # serves http://localhost:3000
```

`apps/web/.env.local` (gitignored) must exist:

```
DHAGA_PASSWORD=dhaga-dev            # any password you like
DHAGA_SESSION_SECRET=<long random>  # cookie signing secret
ANTHROPIC_API_KEY=sk-ant-...        # OPTIONAL — enables the AI paths
```

Two test modes:

- **Without `ANTHROPIC_API_KEY`** — extraction uses the offline heuristic
  parser, notes save without facts, Ask AI / drafts show a clear
  "not configured" message. Everything else works.
- **With the key** — the full loop: Haiku extraction, Sonnet answers/drafts,
  metering counts every call.

**Reset to a blank database:** stop the dev server, delete
`apps/web/.dhaga-data/`, restart.

## 1. Landing page

- [ ] `http://localhost:3000/` renders; scroll the feature story — desktop and
      phone mockups swap as the story progresses; no horizontal scroll at 375px.

## 2. Auth

- [ ] `http://localhost:3000/app/people` while signed out → redirected to `/login`.
- [ ] Wrong password → "Wrong password." stays on the form.
- [ ] Correct password → lands on **People**. Refresh — still signed in.
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/export/csv`
      → `401` (API routes are gated too).
- [ ] Sign out (top right) → back to `/login`, and `/app/people` redirects again.

## 3. People (manual CRUD)

- [ ] People → **Add person** → save with just a name → detail page opens.
- [ ] Add another with title/company/emails — the People list shows
      "title · company"; the filter box narrows by name, title, and company.
- [ ] Empty-state cards appear when the list/filter has no results.

## 4. Quick add (capture → review → save)

Paste this into **Quick add**:

```
Nisha Shah
Principal, Early Stage — Meridian Capital
nisha@meridian.vc | +65 9123 4567
meridian.vc · linkedin.com/in/nishashah
Singapore
```

- [ ] Click **Extract contact** — a badge says *Extracted with AI* (key set)
      or *Parsed offline* (no key). Fields are pre-filled; fix anything wrong.
- [ ] Type a new session name (e.g. `Web Summit 2026`) in the session picker,
      then **Save person**.
- [ ] On the new contact: the session chip appears, and the pasted text is
      stored as a **capture source** note — that's the receipt for the fields.
- [ ] With a key: the "N of 25 AI actions used this month" counter on Quick
      add increased by one.

## 5. Sessions

- [ ] **Sessions** lists `Web Summit 2026` with a people count.
- [ ] Open it — Nisha is listed; click through back to her page.
- [ ] Create a second session from the Sessions page directly.

## 6. Notes → facts with receipts (needs the API key for extraction)

On a contact, add this note:

> Runs ops for a freight forwarder. They're evaluating route-optimisation AI
> next quarter, and she introduced me to their CTO. Follow up after their
> fiscal year starts.

- [ ] Note saves instantly; message reports how many facts/follow-ups were
      extracted (or explains why not, without a key).
- [ ] **Facts** show with type labels and "from note, {date}" receipts.
- [ ] **Follow-ups** shows the action with the timing hint; the ✓ marks it done.
- [ ] Delete a single fact — only it disappears.
- [ ] Delete the note — its remaining derived facts disappear with it
      (receipts invariant: no fact outlives its source).

## 7. Search (hybrid: keyword + local semantic)

- [ ] Search `freight` — the contact appears with the matching fact/note
      snippet quoted under the name.
- [ ] If an "Indexing N items in the background" line shows, existing data is
      being embedded automatically (first run downloads a ~35 MB model,
      one-time, local). Refresh after a minute and the line disappears.
- [ ] Semantic test: search `logistics shipping` (words that appear in NO
      note verbatim) — the freight-forwarder contact still surfaces, with a
      "related note/fact:" snippet. That's the local embeddings working.
- [ ] Search gibberish — honest "No matches" empty state.
- [ ] With a key: **Ask AI ✦** composes an answer naming the right person and
      citing their facts/notes. It only runs when clicked. It now also runs a
      query-understanding step — try "who did I meet at Web Summit in
      fintech?" and confirm the answer respects the event scope.

## 7b. Warm paths (Graph page)

- [ ] On **Graph**, pick a company in "Warm path to" → **Find path** — chains
      render as You → person → … → target.
- [ ] Pick a target with no connection — honest "No thread reaches…" message.

## 8. Follow-up draft (needs the API key)

- [ ] On the contact, **Draft follow-up ✦** — the draft must reference at
      least one real note-derived fact (e.g. the route-optimisation AI evaluation).
- [ ] Edit the text, **Copy**, paste somewhere — matches your edit.
- [ ] **Redraft** replaces your edits with a fresh draft.

## 9. Export (no lock-in)

- [ ] On People, the `csv` / `vcard` / `json` links each download a file.
- [ ] CSV opens in a spreadsheet with correct columns; vCard imports into a
      contacts app; JSON contains contacts, companies, sessions, notes, facts,
      edges, follow_ups.

## 10. Forget this person (privacy cascade)

- [ ] On a contact, **Forget this person** → browser confirm → gone,
      redirected to People.
- [ ] Their sessions no longer list them; search finds nothing; a fresh JSON
      export contains no trace (contact, notes, facts, edges, follow-ups all gone).

## 10b. Email (needs RESEND_API_KEY + RESEND_FROM_EMAIL)

- [ ] Join the waitlist on the landing page with a real address — a branded
      confirmation email arrives.
- [ ] On a session page with people in it, **Email me the digest** — the
      digest (people + facts + follow-ups) arrives at `DHAGA_OWNER_EMAIL`.
- [ ] Unset `DHAGA_OWNER_EMAIL` and retry — clear error, no crash.

## 10c. Enrichment (needs ANTHROPIC_API_KEY)

- [ ] On a contact with a real public identity, **Enrich from public web ✦**
      — a "web enrichment" note appears with cited source URLs, and facts
      extracted from it carry the note as their receipt.
- [ ] Delete the enrichment note — its derived facts disappear with it.

## 11. Metering cap

- [ ] Set `DHAGA_AI_MONTHLY_CAP=1` in `.env.local`, restart, run one
      extraction, then try another AI action — friendly "cap reached" message,
      and capture falls back to the offline parser instead of failing.
- [ ] Remove the override and restart.

## 11b. Browser extension

- [ ] `npm run build --workspace @dhaga/extension`, then Chrome →
      `chrome://extensions` → Developer mode → **Load unpacked** →
      `apps/extension/dist`.
- [ ] With the web app running and you signed in: select a person's details
      on any page (name, title, email), click the Dhaga icon — the selection
      is pre-filled — **Save to my network** → success links to the contact.
- [ ] The contact's notes include the selection with the page URL (receipt).
- [ ] Signed out: saving shows "Sign in to Dhaga" with a login link.

## 12. Static verification (CI)

```bash
npm run lint --prefix apps/web           # ESLint
npm run typecheck --workspace @dhaga/core
npm run build                            # production build must pass
```
