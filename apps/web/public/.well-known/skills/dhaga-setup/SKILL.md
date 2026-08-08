---
name: dhaga-setup
description: >-
  Use when connecting a client to a user's Dhaga personal CRM over MCP, or when an
  existing Dhaga connection is not working. Triggers include "connect Dhaga", "set up
  the Dhaga MCP server", "add Dhaga to Claude Code", "add Dhaga to Cursor", "add Dhaga
  as a custom connector in claude.ai or ChatGPT", "where do I get a Dhaga API key",
  "my dhaga_* tools aren't showing up", "Dhaga MCP returns 401", "Dhaga stopped
  working after I revoked a token", and wiring a self-hosted Dhaga instance URL into a
  client config.
metadata:
  short-description: Connect a client to Dhaga's MCP server
---

# Connect a client to Dhaga

Dhaga is the user's private personal CRM. Its MCP server exposes the graph — contacts,
the notes the user wrote, facts extracted from those notes, and open follow-ups — to
any MCP client.

The endpoint is `/api/mcp` on the user's own instance, over Streamable HTTP:

- Hosted: `https://www.dhaga.app/api/mcp`
- Self-hosted: `https://your-dhaga-host/api/mcp`

Ask which one applies before writing any config. Do not assume the hosted URL.

## Pick the credential

Two paths reach the same tools. The client decides which one you use.

| Client | Credential |
|---|---|
| claude.ai, ChatGPT, anything with a "custom connector" box | OAuth 2.1 connector — paste the URL only |
| Claude Code, Cursor, other local config-file clients | Personal access token in an `x-api-key` header |

**OAuth 2.1 connector.** Paste the endpoint URL and nothing else. Discovery
(`/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`),
dynamic client registration, login and consent are all negotiated for you. No keys are
copied by hand, so there is nothing to leak in a chat transcript.

**Personal access token.** The user creates it in Dhaga under **Settings > Account >
API keys** — the same token the mobile app uses. It goes in an `x-api-key` header.
On the hosted tier, *creating* one needs a Pro or Power plan (tokens already issued
keep working, on any plan); a self-hosted instance has no such gate.
Treat it as a password: do not echo it back, do not paste it into a file the user
shares. Revoking it in Settings cuts off every client holding it immediately.

## Both paths need the plan

On the hosted tier, `/api/mcp` itself is part of Pro and Power — the OAuth connector
is **not** a way around a greyed-out Create token button. An account without the plan
gets `403 {"error": "plan_required"}` on every request, whichever credential it sent.
That is not an auth failure: do not retry, do not re-run the OAuth flow, do not suggest
a different client. Tell the user to upgrade in Settings, or to self-host (no plans, no
gate). If tools never appear and the client reports a connection error, check for that
403 before debugging the config.

## Steps

1. Confirm the instance URL (hosted or self-hosted).
2. Choose the credential from the table above.
3. For the token path, have the user create one in Settings > Account > API keys and
   keep it out of the conversation.
4. Apply the config for their client — see [references/clients.md](references/clients.md)
   for the exact block per client.
5. Restart or reconnect the client. Tools do not appear until it re-handshakes.
6. Verify with a cheap read: `dhaga_list_follow_ups()` takes no arguments and costs no
   AI credits. If it returns, the connection is live.

## What you get once connected

Six read tools — `dhaga_search`, `dhaga_list_contacts`, `dhaga_get_contact`,
`dhaga_list_follow_ups`, `dhaga_find_warm_path`, `dhaga_list_upcoming_dates` — all free.
Four additive write tools — `dhaga_add_note`, `dhaga_create_contact`,
`dhaga_create_follow_up`, `dhaga_close_follow_up`.

There is no delete, merge, bulk, export or admin tool, and that is a decision rather
than a gap. Deleting a contact in Dhaga cascades through notes, facts, edges and
embeddings — fine when a human clicks it, unrecoverable when a confused or
prompt-injected client does it. Irreversible operations stay in the app.

There is also no "ask Dhaga" AI tool. The connected client is already a model, so it
gets raw retrieval with receipts and reasons for itself. That is why reads are free.

For using the tools well, see the `dhaga-network` skill (lookups) and `dhaga-capture`
skill (writing back).

## Troubleshooting

**Tools are missing after a config change.** The client only reads MCP config at
startup or on an explicit reconnect. Restart it before debugging anything else.

**401 with a `WWW-Authenticate` challenge.** The call arrived unauthenticated. The
header or connector never attached. Check the header name is exactly `x-api-key`, and
that the config file the client actually loads is the one you edited.

**401 with no challenge, on a client that worked yesterday.** A bearer token that fails
to resolve is a hard 401. A revoked or expired OAuth grant looks exactly like this.
Reconnect the connector — do not start rewriting the URL, which is rarely the cause.

**403 with `{"error": "plan_required"}`.** Not an auth problem — the credential
resolved fine, the account just isn't on Pro or Power (hosted tier only). Reconnecting
and re-issuing tokens both change nothing. The `error_description` says what to do.

**Self-hosted: OAuth tokens the client rejects.** If `BETTER_AUTH_URL` does not match
the URL clients actually reach, the issued tokens carry the wrong issuer and the client
throws them out. Fix the env var to the externally reachable origin. The `x-api-key`
path is unaffected, because a plain header does not involve an issuer — so a token that
works while the connector fails points straight at this.

**HTTP 429 with `retry-after`.** The limit is 60 tool calls per minute per user. Normal
work never reaches it; a retry loop does. Back off for the stated interval and stop
re-firing the same call.

## stdio-only clients

A client that speaks stdio and nothing else can bridge with the community package
`mcp-remote`. Dhaga does not ship it, and the bridge is one more process that can
fail — prefer direct HTTP wherever the client supports it. Details in
[references/clients.md](references/clients.md).
