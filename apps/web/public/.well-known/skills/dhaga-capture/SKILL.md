---
name: dhaga-capture
description: >-
  Use when writing something back into the user's Dhaga personal CRM. Triggers include
  "log this meeting", "log that call", "save this person to Dhaga", "add a note about
  <person>", "capture this conversation", "remind me to follow up with <person>", "set
  a reminder to email <person> on Friday", "mark that follow-up done", "that one no
  longer applies", and any pasted email signature, business-card text, LinkedIn blurb
  or list of people met at a conference that the user wants kept.
metadata:
  short-description: Save people, notes and follow-ups into Dhaga
---

# Writing back to Dhaga

This skill assumes Dhaga's MCP server is connected. If the `dhaga_*` tools are not
available, use the `dhaga-setup` skill first.

For looking things up rather than saving them, see the `dhaga-network` skill.

All four write tools are additive. Nothing here deletes anything — there is no delete
or merge tool, deliberately, because a contact delete in Dhaga cascades through notes,
facts, edges and embeddings and cannot be undone by a client.

## Costs

Reads are free. A note costs 1 AI credit, because it queues background extraction that
turns the text into facts and follow-ups, each carrying a `source_note_id` receipt back
to the note. `dhaga_create_contact` with a `note` costs the same 1 credit for that
note.

If the user is out of credits, the note is still **saved** and only extraction is
skipped. The tool result tells you which happened. Report it — the user needs to know
their note exists but produced no facts, and assuming either outcome is a lie.

## Dedupe before you create

Search before creating a person: by name, and by email if you have one. Both, because a
person can be filed under a different spelling than the one in the signature you were
handed.

`dhaga_create_contact` may also promote an existing mentioned-stub in place — a person
who so far only appears inside someone else's note becomes a real contact rather than a
second record. That is the good path, and it only happens if the name matches, which is
another reason to check the exact spelling first.

If there is any real chance the person already exists, ask. A duplicate is worse than a
question.

## Write what the user said

The note body is evidence. Extraction runs over it and turns whatever is there into
facts, so anything you embellish becomes a "fact" with a receipt pointing at text the
user never wrote.

- Record what the user actually told you. No inferred seniority, no guessed company, no
  tidied-up job titles.
- Put the substance in the note body rather than inventing structured fields. Only
  `name` is required on `dhaga_create_contact`; leave `title`, `company`, `location` and
  the rest empty when the user did not state them. Extraction will pick up what is
  really there.
- One note per real interaction. A meeting is one note, not one note per message you
  exchanged about it while writing it up.
- `dhaga_add_note` bodies cap at 20000 characters.

## Follow-ups

`dhaga_create_follow_up({contactId, action, dueDate?})`. `action` caps at 500
characters. `dueDate` is `YYYY-MM-DD` and is **optional** — leave it off unless the user
named a date. An invented deadline turns into a reminder they did not ask for and will
learn to ignore.

`dhaga_close_follow_up({followUpId, status})` takes `done` (it happened) or `dismissed`
(no longer applies). This is a status change, not a deletion: the follow-up stays on the
contact as a record.

Never close a follow-up the user has not confirmed, and never clear a list on your own
initiative because it looks stale. If several items look complete, list them and ask
which to close.

## Worked sequence: log a meeting

The user says "I met Priya Raghavan from Northwind at the design summit, she's hiring a
staff designer, I said I'd send her two names by Friday."

1. `dhaga_search({query: "Priya Raghavan"})` — does she already exist? Check the
   returned snippets for a Northwind mention before deciding.
2. `dhaga_create_contact({name: "Priya Raghavan", company: "Northwind"})` if she is new.
   The company is created if Dhaga does not know it.
3. `dhaga_add_note({contactId, body})` with the account of the meeting in the user's own
   framing: where they met, that Northwind is hiring a staff designer, what was
   promised.
4. `dhaga_create_follow_up({contactId, action: "Send Priya two staff designer
   candidates", dueDate: "<that Friday>"})` — a date here is fine, because the user
   named one.

Then report what was written, including whether extraction ran.

## Pasted signatures and card text

Treat the paste as the source. Copy the fields that are literally present into `emails`,
`phones`, `links`, `title`, `company`, `location`; put the rest — how they met, what was
discussed — in `note`. Do not enrich from outside knowledge, and do not merge two
similar pastes into one person without asking which is which.

## Rate limit

60 tool calls per minute per user. A conference dump of thirty people can approach it.
On a 429, wait for `retry-after` and continue where you stopped — do not restart the
batch, or you will create duplicates.
