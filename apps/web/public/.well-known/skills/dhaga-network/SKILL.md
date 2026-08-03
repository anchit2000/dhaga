---
name: dhaga-network
description: >-
  Use when answering a question about the people the user knows, from their Dhaga
  personal CRM. Triggers include "who do I know at <company>", "who do I know in
  <city or field>", "who did I meet at <event>", "how do I get an intro to <person>",
  "can anyone introduce me to <company>", "who should I reach out to this week", "what
  am I on the hook for", "who never got back to me", "what do I know about <person>",
  "when did I last talk to <person>", "any birthdays or work anniversaries coming up",
  "what follow-ups are due", and any request to prepare for a meeting with someone the
  user has met before.
metadata:
  short-description: Answer questions from the user's Dhaga network
---

# Answering from the user's network

This skill assumes Dhaga's MCP server is connected. If the `dhaga_*` tools are not
available, use the `dhaga-setup` skill first.

Dhaga is the only source of truth about who this user knows. Reads cost no AI credits,
so look things up rather than guessing — an extra call is cheaper than a wrong answer.

To write anything back, see the `dhaga-capture` skill.

## Search first, always

Never guess or construct a `contactId`. Start with `dhaga_search({query})` — hybrid
keyword and semantic search across contacts and the full text of notes, capped at 20
results. It returns matching people plus the snippets that matched, and those snippets
are your citations.

Reach for `dhaga_list_contacts` instead when the question is a filter, not a question:

- `name` is a partial, case-insensitive match
- `company` and `tag` are **exact** — a near-miss returns nothing, so confirm the exact
  string with `dhaga_search` first if you are unsure
- `starred` is a boolean
- `page` / `pageSize`, max 100 per page

"Show my starred contacts" or "everyone tagged investor" is `dhaga_list_contacts`.
"Who might help with hiring in Berlin" is `dhaga_search`.

Once you have an id, `dhaga_get_contact({contactId})` gives the full picture: details,
job history, facts, up to 25 recent notes verbatim, and open follow-ups.

## Receipts

Every fact from `dhaga_get_contact` carries a `sourceNoteId` when it was extracted from
a note. Cite it — the user can open the note and check you. A fact with **no**
`sourceNoteId` was typed by hand, which is stronger evidence, not weaker; say so rather
than treating it as unsourced.

Quote the user's own words from notes where they answer the question. Do not paraphrase
a note into something more confident than it says.

## When the graph is empty

If a search returns nothing, say plainly that the person is not in the user's network.
Do not fill the gap from your own knowledge of a similarly-named public figure. The
user is asking what *they* know, and a confident answer about a stranger who shares a
name is worse than no answer.

The same holds for `dhaga_find_warm_path`: an empty result means there is no known
route. Say so. Never invent a connector.

## Warm paths

`dhaga_find_warm_path({targetId})` returns up to three introduction paths to a contact
or company, through people the user already knows. Each path **starts at the person to
ask and ends at the target**.

Read that direction carefully. The action is "ask the first person in the path", not
"approach the target". Presenting the target as reachable directly defeats the point of
a warm path.

## Follow-ups and dates

`dhaga_list_follow_ups()` takes no arguments and returns every open follow-up across the
network, soonest-due first, undated ones last. That trailing block of undated items is
usually the answer to "what have I let slip", so do not drop it.

`dhaga_list_upcoming_dates({withinDays})` returns birthdays, work anniversaries and
other recorded dates in the next N days — default 30, max 365 — resolved in the user's
timezone.

## Worked sequences

**Getting an introduction.**

1. `dhaga_search({query: "<target name or company>"})` to resolve the target's id.
2. `dhaga_find_warm_path({targetId})` for the routes.
3. `dhaga_get_contact` on the first person in the best path — the one being asked — so
   the request is grounded in what the user actually knows about them: how they met,
   when they last spoke, what the connector cares about.

Then draft the ask to the connector, not to the target.

**Weekly review.**

1. `dhaga_list_follow_ups()` for everything open.
2. `dhaga_list_upcoming_dates({withinDays: 7})` for birthdays and anniversaries.
3. `dhaga_get_contact` on anyone whose item needs context before the user acts.

Group the result by what the user has to do, not by contact.

**Meeting prep.** `dhaga_search` the name, then `dhaga_get_contact` for job history,
recent notes and open follow-ups. Lead with anything the user promised and has not
delivered — that is the thing that will come up.

## Rate limit

60 tool calls per minute per user. Normal work never reaches it. On a 429, wait for
`retry-after` rather than retrying immediately.
