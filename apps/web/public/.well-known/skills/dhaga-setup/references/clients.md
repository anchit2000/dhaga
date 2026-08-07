# Per-client setup

Replace `https://your-dhaga-host/api/mcp` with `https://www.dhaga.app/api/mcp` on the
hosted tier, or with the user's own origin if they self-host. Replace `YOUR_TOKEN` with
a personal access token from Settings > Account > API keys.

## Claude Code

```bash
claude mcp add --transport http dhaga https://your-dhaga-host/api/mcp \
  --header "x-api-key: YOUR_TOKEN"
```

Verify with `/mcp` in a Claude Code session: `dhaga` should be listed as connected and
its tools enumerated. If the entry is missing, the command wrote to a different scope
than the session is reading — re-run it from the directory you are working in.

The token lands in a config file on disk. Do not commit that file.

## claude.ai

Settings > Connectors > Add custom connector. Paste the endpoint URL:

```
https://your-dhaga-host/api/mcp
```

Nothing else. OAuth discovery, registration, login and consent are negotiated from
that one URL, so there is no key to paste and none to leak.

Caveat: the grant lives with the connector, not with the browser session. If Dhaga
tools start 401ing later, the grant was revoked or expired — remove and re-add the
connector rather than editing the URL.

## ChatGPT

Same shape as claude.ai: add a custom connector and give it the endpoint URL only.

Caveat: connector support varies by plan and workspace. If there is no custom connector
box, this client cannot reach Dhaga directly — a local client with a token is the way
in.

## Cursor and other JSON-config clients

Add to the client's MCP config file:

```json
{
  "mcpServers": {
    "dhaga": {
      "type": "http",
      "url": "https://your-dhaga-host/api/mcp",
      "headers": { "x-api-key": "YOUR_TOKEN" }
    }
  }
}
```

Caveat: the tools appear only after the client restarts or reconnects. Editing the file
in a running client changes nothing until then.

## stdio-only clients

Clients that speak stdio and nothing else need a bridge:

```json
{
  "mcpServers": {
    "dhaga": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://your-dhaga-host/api/mcp",
        "--header", "x-api-key:YOUR_TOKEN"
      ]
    }
  }
}
```

Caveat: `mcp-remote` is a community package, not something Dhaga ships or versions.
Use the direct HTTP config above wherever the client supports it — the bridge is an
extra process between the client and the server, and it is the first thing to suspect
when a connection that worked stops.

## Checking it worked

From any connected client, run `dhaga_list_follow_ups()`. It takes no arguments, costs
no AI credits, and returning at all proves auth and transport are both fine.
