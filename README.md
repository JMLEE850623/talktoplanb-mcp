# TalkToPlanB MCP Server

Let AI assistants (Claude Desktop, and any [Model Context Protocol](https://modelcontextprotocol.io) client) use **[TalkToPlanB](https://talktoplanb.duckdns.org/)** — list chat rooms, read messages, and send messages.

It wraps the TalkToPlanB developer REST API and talks MCP over **stdio**.

## Tools

| Tool | Description |
|---|---|
| `whoami` | Account info for the current API key (user id, username, scopes). |
| `list_rooms` | List your group chats and direct messages (returns room ids). |
| `read_messages` | Read recent messages in a room (`roomId`, optional `limit`). |
| `send_message` | Send a message by `roomId` **or** `toPhone` (plus `text`). |

## 1. Get an API key

1. Open the developer portal: <https://talktoplanb.duckdns.org/portal>
2. Register / log in, create a key, and grant the `messages:read` and `messages:send` scopes.
3. Copy the key (looks like `ttpb_xxxxxxxx...`).

## 2. Use it with Claude Desktop

Add this to your Claude Desktop config
(`%APPDATA%\Claude\claude_desktop_config.json` on Windows,
`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "talktoplanb": {
      "command": "npx",
      "args": ["-y", "talktoplanb-mcp"],
      "env": {
        "TALKTOPLANB_API_KEY": "ttpb_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop, then try: *“List my TalkToPlanB rooms”* or
*“Send a TalkToPlanB message to +60123456789 saying hello.”*

### Environment variables

| Variable | Required | Default |
|---|---|---|
| `TALKTOPLANB_API_KEY` | ✅ | — |
| `TALKTOPLANB_BASE_URL` | ❌ | `https://talktoplanb.duckdns.org` |

## 3. Local development

```bash
cd mcp-server
npm install
npm run build      # compiles src → dist
TALKTOPLANB_API_KEY=ttpb_... npm start
```

## 4. Publish to npm (so `npx talktoplanb-mcp` works for everyone)

```bash
cd mcp-server
npm login
npm publish --access public
```

After publishing, you can list it on MCP registries (mcp.so, Glama, Smithery) —
see `../marketing/listing-checklist.md`.

## Notes

- Requires Node.js 18+ (uses the built-in `fetch`).
- `stdout` carries the MCP protocol; all logs go to `stderr`.
- The server only does what your API key is allowed to do (its scopes).
