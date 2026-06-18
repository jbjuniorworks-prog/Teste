# chat-sample-mcp

Chat Sample's **MCP** (Model Context Protocol) server — a **thin HTTP proxy**
over the API. Each tool forwards the caller's `Authorization: Bearer <PAT>` to the API;
**auth + RBAC + errors** are the API's responsibility. No logic of its own, just translation.

- Official SDK (`mcp.server.fastmcp`), **streamable-http** transport, **pass-through**
  (no token validation — trusts the API).
- Multi-user: each person connects with their **own PAT** and inherits their **own permissions**.

## Tools

`whoami`, `list_users`, `get_user`, `create_user`, `update_user`, `delete_user`, `list_roles`,
`generate_user_report`, `compare_user_lists`.

## Run

Requires the API up (port 8000) and Postgres/Redis (`docker compose up -d` at the root).

```bash
cd apps/mcp
uv sync
uv run python server.py        # streamable-http at http://127.0.0.1:9000/mcp
```

`API_URL` (default `http://127.0.0.1:8000`) configures the proxy target.

## Connect from Claude Code

The server is already declared in the root `.mcp.json`, with the token coming from an
**environment variable** (the file is committable, the secret is not):

```jsonc
// .mcp.json (root)
{ "mcpServers": { "chat-sample": {
  "type": "http",
  "url": "http://127.0.0.1:9000/mcp",
  "headers": { "Authorization": "Bearer ${CHAT_SAMPLE_PAT}" }
}}}
```

Generate a PAT on the `/settings` screen of the web app (or `POST /tokens`), export it and (re)open Claude Code:

```bash
export CHAT_SAMPLE_PAT=pat_xxx
claude   # reconnects and loads the mcp__chat-sample__* tools
```

The variable is read by the **client** (Claude Code), not by the MCP server. Since the value
comes from each person's environment, `.mcp.json` is shared but the identity is per-user.
